package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"sync"
	"time"

	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/ethkit/go-ethereum/common"
	"github.com/0xsequence/ethkit/go-ethereum/core/types"
	"github.com/0xsequence/go-sequence"
	v1 "github.com/0xsequence/go-sequence/core/v1"
	seqRelayer "github.com/0xsequence/go-sequence/relayer"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/contracts/abis"
	"github.com/horizon-games/OpenSky/api/proto"
)

// SendTxnsRunner is responsible for sending transactions to the Sequence Relayer.
// See the Queues() method below to see which queues it does work.

// TODO: this is a pretty big runner, and does a lot of work..
// we might want to split this into separate runners.. for example
// during the time we're minting silver rewards, there will be a big backlog
// so conquest entries will be mixed in that queue.

var _ Runner = &SendTxnsRunner{}

const (
	SendTxnsWorkGroup    = "send-metatxns" // TODO: rename to "send-txns", needs db migration tho
	SendTxnsRetryDelay   = 60              // in seconds
	SendTxnsMaxRetries   = 5
	SendTxnsTickInterval = 15 * time.Second

	// how long to wait before checking if it minted for the first time
	TxnStatusCheckDelay = 10 // in seconds
)

type SendTxnsRunner struct {
	chainID  *big.Int
	provider *ethrpc.Provider

	wallet  *sequence.Wallet[*v1.WalletConfig]
	relayer sequence.Relayer

	conquestStateManager ConquestStateManager

	contractIndex map[string]common.Address

	ticker *time.Ticker
	mu     sync.Mutex

	contractUSDC          ContractUSDC
	contractOpenSkyAssets ContractOpenSkyAssets
}

func (r *SendTxnsRunner) WorkGroup() string {
	return SendTxnsWorkGroup
}

func (r *SendTxnsRunner) Queues() []string {
	return []string{
		ExitConquestQueue,
		MintConquestEntriesQueue,
		MintSilverCardRewardsQueue,
		MintTicketRewardsQueue,
		MintStickerRewardsQueue,
		DelayedMintingQueue,
		SendConquestExtraRewardQueue,
		ConquestV2SendRewardQueue,
		MintLeaderboardRewardsQueue,
		MintCardBackRewardsQueue,
		MintSkypassConquestTicketsQueue,
		MintSkypassSilverCardsQueue,
		MintSkypassStickersQueue,
	}
}

func (r *SendTxnsRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(SendTxnsTickInterval)
	}
	return r.ticker.C
}

func (r *SendTxnsRunner) MaxBatchSize() int {
	return 25
}

func NewSendTxnsRunner(
	conquestStateManager ConquestStateManager,
	contractUSDC ContractUSDC,
	contractOpenSkyAssets ContractOpenSkyAssets,
) (*SendTxnsRunner, error) {
	if contractUSDC == nil {
		return nil, fmt.Errorf("usdc contract is nil")
	}

	if contractOpenSkyAssets == nil {
		return nil, fmt.Errorf("usdc contract is nil")
	}

	r := &SendTxnsRunner{
		conquestStateManager:  conquestStateManager,
		contractUSDC:          contractUSDC,
		contractOpenSkyAssets: contractOpenSkyAssets,
	}

	var err error
	cfg := config.Instance

	// Ethereum
	if cfg.Ethereum.URL == "" {
		return nil, errors.Errorf("Ethereum URL not set in config file")
	}
	r.provider, err = ethrpc.NewProvider(cfg.Ethereum.URL)
	if err != nil {
		return nil, errors.New("can't instantiate ethprovider")
	}

	r.chainID, err = r.provider.ChainID(context.Background())
	if err != nil {
		return nil, err // TODO..
	}

	mintingDelay = time.Minute * time.Duration(cfg.DelayedMinting.MintingDelayMinutes)
	if cfg.DelayedMinting.MintingDelayMinutes == 0 {
		mintingDelay = DefaultMintingDelay
	}

	// Relayer
	if cfg.Sequence.RelayerURL == "" {
		return nil, errors.Errorf("Sequence Relayer URL not set in config file")
	}
	if cfg.Sequence.AccessKey == "" {
		return nil, errors.Errorf("Sequence Access Key not set in config file")
	}
	r.relayer, err = seqRelayer.NewRpcRelayer(cfg.Sequence.RelayerURL, cfg.Sequence.AccessKey, r.provider, nil)
	if err != nil {
		return nil, fmt.Errorf("new runner failed, relayer: %w", err)
	}

	// Wallet
	if cfg.Wallet.PrivateMnemonic == "" {
		return nil, errors.Errorf("Wallet private key not set in config file")
	}
	r.wallet, err = config.InstantiateWallet(cfg.Wallet, r.provider, r.relayer)
	if err != nil {
		return nil, err
	}

	r.contractIndex = make(map[string]common.Address)

	log.Info().Msgf("using sequence wallet %s to send rewards", r.wallet.Address().String())

	return r, nil
}

func (r *SendTxnsRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	oplog := log.With().Str("op", SendTxnsWorkGroup).Logger()
	oplog.Info().Msgf("%s running", SendTxnsWorkGroup)

	// NOTE: this appears to not be necessary and relayer will do it for us.
	// Generate random nonce for the wallet to avoid collisions, and allow
	// us to exec txns independently of eachother.
	// nonce, err := sequence.GenerateRandomNonce()
	// if err != nil {
	// 	oplog.Err(err).Msgf("Generating random nonce failed")
	// 	UpdateFailedTasks(tasks, SendTxnsRetryDelay, SendTxnsMaxRetries)
	// 	return err
	// }

	// Prepare txn with bundle and a random nonce at top-level
	// txn := &sequence.Transaction{
	// 	Nonce:        nonce,
	// 	To:           r.wallet.Address(), // TODO: correct..?
	// 	Transactions: sequence.Transactions{},
	// }
	// bundle := txn.Transactions

	// NOTE: this bundle size is bounded by the `MaxBatchSize` of the number of tasks included
	bundle := sequence.Transactions{}

	txnTasks := make([]*data.Task, 0, len(tasks))

	// Send leaderboard rewards (silver cards)
	childTxns, activeTasks, err := r.runLeaderboardRewards(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runLeaderboardRewards failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send conquest entries
	childTxns, activeTasks, err = r.runConquestEntries(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runConquestEntries failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send delayed conquest rewards (gold cards)
	childTxns, activeTasks, err = r.runDelayedMinting(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runDelayedMinting failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send delayed extra conquest rewards (hero skins)
	childTxns, activeTasks, err = r.runExtraConquestRewards(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runExtraConquestRewards failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send conquest V2 reward
	childTxns, activeTasks, err = r.runConquestV2SendRewards(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runConquestV2SendRewards failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send sticker rewards
	childTxns, activeTasks, err = r.runStickerRewards(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runStickerRewards failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send card back rewards
	childTxns, activeTasks, err = r.runCardBackRewards(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runCardBackRewards failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Send conquest exits / rewards
	childTxns, activeTasks, err = r.runExitConquests(ctx, sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runExitConquests failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	childTxns, activeTasks, err = r.runSkypassConquestTickets(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runSkypassConquestTickets failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	childTxns, activeTasks, err = r.runSkypassStickers(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runSkypassStickers failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	childTxns, activeTasks, err = r.runSkypassSilverCards(sess, tasks)
	if err != nil {
		oplog.Err(err).Msgf("runSkypassSilverCards failed, skipping..")
	} else {
		txnTasks = append(txnTasks, activeTasks...)
		bundle.Append(childTxns)
	}

	// Skip if nothing in the bundle
	if len(bundle) == 0 {
		oplog.Warn().Msgf("skipping sending an empty txn bundle - %d transactions failed to be included", len(tasks))
		return nil
	}

	// Now, we must sign the txn bundle
	signedTxn, err := r.wallet.SignTransactions(ctx, bundle)
	if err != nil {
		oplog.Err(err).Msgf("failed to sign txn bundle")
		UpdateFailedTasks(tasks, SendTxnsRetryDelay, SendTxnsMaxRetries)
		return err
	}

	// Send the txn to the Sequence Relayer :)
	metaTxnID, _, _, err := r.wallet.SendTransactions(ctx, signedTxn)
	if err != nil {
		oplog.Err(err).Msgf("failed to send txn bundle to the relayer")
		UpdateFailedTasks(tasks, SendTxnsRetryDelay, SendTxnsMaxRetries)
		return err
	}
	oplog.Info().Msgf("sent metaTxnID %s", metaTxnID)

	// Enqueue new tasks to monitor the txn statuses
	var oldestTask time.Time
	statusCheckTask := TxnStatusTask{MetaTxnID: metaTxnID}
	for _, task := range txnTasks {
		statusCheckTask.TaskIDs = append(statusCheckTask.TaskIDs, task.ID)
		if oldestTask.IsZero() || task.RunAt.Before(oldestTask) {
			oldestTask = *task.RunAt
		}
	}
	statusCheckTask.SubmittedAt = oldestTask

	firstStatusCheckAt := time.Now().UTC().Add(TxnStatusCheckDelay * time.Second)
	err = data.DB.Tasks(sess).EnqueueTask(
		TxnStatusGroup, statusCheckTask, &firstStatusCheckAt, nil,
	)
	if err != nil {
		log.Error().Msgf("metatxn %s sent, but failed to enqueue status check task for it with: %v. Marking tasks PAUSED. This requires human intervention to prevent double-minting", metaTxnID, err)
		UpdatePausedTasks(txnTasks)
		return nil
	}

	UpdateCompletedTasks(txnTasks)

	return nil
}

func (r *SendTxnsRunner) runExitConquests(ctx context.Context, sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var exitConquests []*data.Task

	for _, task := range tasks {
		if task.Queue == ExitConquestQueue {
			exitConquests = append(exitConquests, task)
		}
	}

	if len(exitConquests) == 0 {
		return []*sequence.Transaction{}, exitConquests, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(exitConquests))

	silverRewardAddress := common.HexToAddress(config.Instance.Contracts.SilverRewardFactory)
	silverRewardArtifact := abis.SilverRewardFactory

	for _, task := range exitConquests {
		var payload ExitConquestTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			log.Err(err).Msg("decode payload ExitConquestTask")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		if len(payload.SilverCardIDs) > 0 {
			tokenIDs := make([]*big.Int, 0)
			amounts := make([]*big.Int, 0)

			for _, tokenID := range payload.SilverCardIDs {
				t := big.Int{}
				t.SetUint64(tokenID)
				tokenIDs = append(tokenIDs, &t)

				a := big.Int{}
				a.SetUint64(100)
				amounts = append(amounts, &a)
			}

			account, err := data.DB.Accounts(sess).FindByID(accountID)
			if err != nil {
				log.Err(err).Msgf("find account %d", accountID)
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				continue
			}

			toAddress := common.HexToAddress(account.Address.String())

			encodedData, err := silverRewardArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
			if err != nil {
				log.Err(err).Msgf("encoding silver reward input")
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				continue
			}

			bundle.Append([]*sequence.Transaction{
				{To: silverRewardAddress, Data: encodedData},
			})
		}

		activeTasks = append(activeTasks, task)

		if err := r.conquestStateManager.Complete(ctx, sess, accountID, payload.ConquestID); err != nil {
			log.Err(err).Msg("complete conquest")
			UpdateFailedTasks([]*data.Task{task}, ExitConquestRetryDelay, ExitConquestMaxRetries)

			continue
		}

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runStickerRewards(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var stickerRewards []*data.Task

	for _, task := range tasks {
		if task.Queue == MintStickerRewardsQueue {
			stickerRewards = append(stickerRewards, task)
		}
	}

	if len(stickerRewards) == 0 {
		return []*sequence.Transaction{}, []*data.Task{}, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(stickerRewards))

	rewardContractAddress := common.HexToAddress(config.Instance.Contracts.StickerRewardsContract)
	rewardContractArtifact := abis.LeaderboardRewardFactory // TODO

	// Sticker tasks
	for _, task := range stickerRewards {
		var payload MintStickerRewardsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			UpdateFailedTasks([]*data.Task{task}, 0, 0)
			log.Err(err).Msgf("decode sticker reward payload")
			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		for tokenID, amount := range payload.StickerAmounts {
			t := big.Int{}
			t.SetUint64(tokenID)
			tokenIDs = append(tokenIDs, &t)

			a := big.Int{}
			a.SetUint64(amount)
			amounts = append(amounts, &a)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		// Encode call to sticker rewards contract to "batchMint(..)" rewards
		rewardInput, err := rewardContractArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Err(err).Msgf("encoding sticker rewards input")
			UpdateFailedTasks([]*data.Task{task}, MintStickerRewardsRetryDelay, MintStickerRewardsMaxRetries)
			continue
		}

		// Append to the list to be returned
		bundle.Append([]*sequence.Transaction{
			{To: rewardContractAddress, Data: rewardInput},
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runLeaderboardRewards(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var leaderboardRewards, silverCardRewards, conquestTicketRewards []*data.Task

	for _, task := range tasks {
		if task.Queue == MintLeaderboardRewardsQueue {
			leaderboardRewards = append(leaderboardRewards, task)
		} else if task.Queue == MintSilverCardRewardsQueue {
			silverCardRewards = append(silverCardRewards, task)
		} else if task.Queue == MintTicketRewardsQueue {
			conquestTicketRewards = append(conquestTicketRewards, task)
		}
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(leaderboardRewards)+len(silverCardRewards)+len(conquestTicketRewards))

	silverRewardContractAddress := common.HexToAddress(config.Instance.Contracts.LeaderboardSilverRewardsContract)
	ticketRewardContractAddress := common.HexToAddress(config.Instance.Contracts.LeaderboardTicketRewardsContract)
	rewardContractArtifact := abis.LeaderboardRewardFactory

	if len(leaderboardRewards)+len(silverCardRewards)+len(conquestTicketRewards) == 0 {
		return []*sequence.Transaction{}, []*data.Task{}, nil
	}

	for _, task := range leaderboardRewards {
		var payload MintLeaderboardRewardsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintLeaderboardRewardsRetryDelay, MintLeaderboardRewardsMaxRetries)
			log.Error().Msgf("failed unmarshalling leaderboard rewards payload with: %v", err)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		if len(payload.SilverCardAmounts) > 0 {
			tokenIDs := make([]*big.Int, 0)
			amounts := make([]*big.Int, 0)

			for tokenID, amount := range payload.SilverCardAmounts {
				t := big.Int{}
				t.SetUint64(tokenID)
				tokenIDs = append(tokenIDs, &t)

				a := big.Int{}
				a.SetUint64(amount)
				amounts = append(amounts, &a)
			}

			account, err := data.DB.Accounts(sess).FindByID(accountID)
			if err != nil {
				log.Err(err).Msgf("find account %d", accountID)
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				continue
			}

			toAddress := common.HexToAddress(account.Address.String())

			leaderboardRewardInput, err := rewardContractArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
			if err != nil {
				log.Error().Msgf("encoding leaderboard silver rewards input failed with: %v", err)
				UpdateFailedTasks([]*data.Task{task}, MintLeaderboardRewardsRetryDelay, MintLeaderboardRewardsMaxRetries)

				continue
			}

			bundle.Append([]*sequence.Transaction{
				{To: silverRewardContractAddress, Data: leaderboardRewardInput},
			})

			activeTasks = append(activeTasks, task)
		}

		var silverCardAmounts map[uint64]uint64

		if len(payload.SilverCardAmounts) > 0 {
			silverCardAmounts = make(map[uint64]uint64)

			for tokenID, amount := range payload.SilverCardAmounts {
				silverCardAmounts[tokenID] = amount / cardDecimalsMultiplier
			}
		}

		_, err = data.DB.Notifications(sess).CreateLeaderboardRewardNotification(&proto.NotificationLeaderboardReward{
			Season:                       payload.Season,
			Week:                         payload.Week,
			SilverCardAmounts:            silverCardAmounts,
			TicketAmount:                 payload.TicketAmount,
			RankedConstructedRank:        payload.RankedConstructedRank,
			RankedDiscoveryRank:          payload.RankedDiscoveryRank,
			EarnedConstructedPlayerRanks: payload.EarnedConstructedPlayerRanks,
			EarnedDiscoveryPlayerRanks:   payload.EarnedDiscoveryPlayerRanks,
		}, accountID, nil, nil)
		if err != nil {
			log.Err(err).Msgf("create conquest reward notification")
			UpdateFailedTasks([]*data.Task{task}, ConquestV2SendRewardRetryDelay, ConquestV2SendRewardMaxRetries)

			continue
		}

		activeTasks = append(activeTasks, task)
	}

	// Silver card tasks
	for _, task := range silverCardRewards {
		var payload MintSilverCardRewardsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintSilverCardRewardsRetryDelay, MintSilverCardRewardsMaxRetries)
			log.Error().Msgf("failed unmarshalling silver card reward payload with: %v", err)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		for tokenID, amount := range payload.CardAmounts {
			t := big.Int{}
			t.SetUint64(tokenID)
			tokenIDs = append(tokenIDs, &t)

			a := big.Int{}
			a.SetUint64(amount)
			amounts = append(amounts, &a)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		silverCardRewardInput, err := rewardContractArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Error().Msgf("encoding silver card rewards input failed with: %v", err)
			UpdateFailedTasks([]*data.Task{task}, MintSilverCardRewardsRetryDelay, MintSilverCardRewardsMaxRetries)

			continue
		}

		bundle.Append([]*sequence.Transaction{
			{To: silverRewardContractAddress, Data: silverCardRewardInput},
		})

		activeTasks = append(activeTasks, task)
	}

	// Conquest ticket task
	for _, task := range conquestTicketRewards {
		var payload MintTicketRewardsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintTicketRewardsRetryDelay, MintTicketRewardsMaxRetries)
			log.Error().Msgf("failed unmarshalling conquest ticket reward payload with: %v", err)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		t := big.Int{}
		t.SetUint64(ConquestTicketV1ID)
		tokenIDs = append(tokenIDs, &t)

		a := big.Int{}
		a.SetUint64(payload.TicketAmount)
		amounts = append(amounts, &a)

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		conquestTicketRewardInput, err := rewardContractArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Error().Msgf("encoding conquest ticket rewards input failed with: %v", err)
			UpdateFailedTasks([]*data.Task{task}, MintTicketRewardsRetryDelay, MintTicketRewardsMaxRetries)

			continue
		}

		bundle.Append([]*sequence.Transaction{
			{To: ticketRewardContractAddress, Data: conquestTicketRewardInput},
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runCardBackRewards(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var cardBackRewards []*data.Task

	for _, task := range tasks {
		if task.Queue == MintCardBackRewardsQueue {
			cardBackRewards = append(cardBackRewards, task)
		}
	}

	if len(cardBackRewards) == 0 {
		return []*sequence.Transaction{}, []*data.Task{}, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(cardBackRewards))

	cardBackRewardContractAddress := common.HexToAddress(config.Instance.Contracts.CardBackRewardsContract)
	rewardContractArtifact := abis.LeaderboardRewardFactory

	for _, task := range cardBackRewards {
		var payload MintCardBackRewardsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintCardBackRewardsRetryDelay, MintCardBackRewardsMaxRetries)
			log.Error().Msgf("failed unmarshalling card back reward payload with: %v", err)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		for tokenID, amount := range payload.CardBackAmounts {
			t := big.Int{}
			t.SetUint64(tokenID)
			tokenIDs = append(tokenIDs, &t)

			a := big.Int{}
			a.SetUint64(amount)
			amounts = append(amounts, &a)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		cardBackRewardInput, err := rewardContractArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Error().Msgf("encoding card back rewards input failed with: %v", err)
			UpdateFailedTasks([]*data.Task{task}, MintCardBackRewardsRetryDelay, MintCardBackRewardsMaxRetries)

			continue
		}

		bundle.Append([]*sequence.Transaction{
			{To: cardBackRewardContractAddress, Data: cardBackRewardInput},
		})

		activeTasks = append(activeTasks, task)
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runConquestEntries(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var conquestEntryMints []*data.Task

	for _, task := range tasks {
		if task.Queue == MintConquestEntriesQueue {
			conquestEntryMints = append(conquestEntryMints, task)
		}
	}

	if len(conquestEntryMints) == 0 {
		return []*sequence.Transaction{}, conquestEntryMints, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(tasks))

	contractAddress := common.HexToAddress(config.Instance.Contracts.FreeConquestEntriesFactory)
	// #TODO: Change to the FreeConquestEntriesFactory ABI
	contractArtifact := abis.FreeConquestEntriesFactory

	for _, task := range conquestEntryMints {
		var payload MintConquestEntriesTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			log.Error().Msgf("failed unmarshalling conquest entry payload with: %v", err)
			return nil, nil, proto.WrapError(proto.ErrInternal, err, "failed unmarshalling conquest entry payload")
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		conquestTokenId := []*big.Int{big.NewInt(int64(config.Instance.Contracts.ConquestTokenId))}

		if payload.Amounts == nil || len(payload.Amounts) == 0 {
			log.Error().Msgf("conquest task is invalid, removing it.")
			// Remove Task from queue safely to avoid memory leaks
			task = nil

			continue
		}

		// multiply the amount by 100, to consider two decimal places
		var amounts []*big.Int
		for _, a := range payload.Amounts {
			amounts = append(amounts, new(big.Int).Mul(a, big.NewInt(100)))
		}

		log.Info().Msgf("Encoding with address %s for conquest IDs %d and amounts %d", toAddress, conquestTokenId, amounts)

		// Encode call to free conquest entries factory to "batchMint(..)" conquest tickets
		conquestMintInput, err := contractArtifact.Encode("batchMint", toAddress, conquestTokenId, amounts, []byte(nil))
		if err != nil {
			log.Error().Msgf("encoding conquest entry transfer input failed with: %v", err)
			UpdateFailedTasks([]*data.Task{task}, MintConquestEntriesRetryDelay, MintConquestEntriesMaxRetries)

			continue
		}

		// Append to the list to be returned
		bundle.Append([]*sequence.Transaction{
			{To: contractAddress, Data: conquestMintInput},
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runDelayedMinting(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var delayedMintings []*data.Task

	logger := log.With().Str("method", "runDelayedMinting").Logger()

	for _, task := range tasks {
		if task.Queue == DelayedMintingQueue {
			delayedMintings = append(delayedMintings, task)
		}
	}

	if len(delayedMintings) == 0 {
		return []*sequence.Transaction{}, delayedMintings, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(delayedMintings))

	goldRewardAddress := common.HexToAddress(config.Instance.Contracts.GoldRewardFactory)
	goldRewardArtifact := abis.GoldRewardFactory

	for _, task := range delayedMintings {
		var payload DelayedMintingTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			logger.Err(err).Msg("decode payload DelayedMintingTask")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		if len(payload.TokenIDs) > 0 {
			accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
			if err != nil {
				logger.Err(err).Msgf("get account ID")
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				continue
			}

			tokenIDs := make([]*big.Int, 0)
			amounts := make([]*big.Int, 0)

			for _, tokenID := range payload.TokenIDs {
				t := big.Int{}
				t.SetUint64(tokenID)
				tokenIDs = append(tokenIDs, &t)

				a := big.Int{}
				a.SetUint64(100)
				amounts = append(amounts, &a)
			}

			account, err := data.DB.Accounts(sess).FindByID(accountID)
			if err != nil {
				logger.Err(err).Msgf("find account %d", accountID)
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				continue
			}

			toAddress := common.HexToAddress(account.Address.String())

			encodedData, err := goldRewardArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
			if err != nil {
				logger.Err(err).Msgf("encoding gold reward input")
				UpdateFailedTasks([]*data.Task{task}, 0, 0)

				continue
			}

			bundle.Append([]*sequence.Transaction{
				{To: goldRewardAddress, Data: encodedData},
			})
		}

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runExtraConquestRewards(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var extraConquestRewards []*data.Task

	for _, task := range tasks {
		if task.Queue == SendConquestExtraRewardQueue {
			extraConquestRewards = append(extraConquestRewards, task)
		}
	}

	if len(extraConquestRewards) == 0 {
		return []*sequence.Transaction{}, extraConquestRewards, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(extraConquestRewards))

	for _, task := range extraConquestRewards {
		var payload SendConquestExtraRewardTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			log.Err(err).Msgf("failed unmarshalling extra conquest reward payload")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		fromAddress := proto.HashFromString(r.wallet.Address().String())

		transaction, err := r.contractOpenSkyAssets.ComposeSafeBatchTransferFrom(fromAddress, account.Address, payload.Assets, nil)
		if err != nil {
			log.Err(err).Msg("compose safe batch transfer from transaction")
			UpdateFailedTasks([]*data.Task{task}, SendConquestExtraRewardRetryDelay, SendConquestExtraRewardMaxRetries)

			continue
		}

		bundle.Append([]*sequence.Transaction{
			contracts.ConvertToSequenceTransaction(transaction),
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runConquestV2SendRewards(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var conquestV2SendRewards []*data.Task

	for _, task := range tasks {
		if task.Queue == ConquestV2SendRewardQueue {
			conquestV2SendRewards = append(conquestV2SendRewards, task)
		}
	}

	if len(conquestV2SendRewards) == 0 {
		return []*sequence.Transaction{}, conquestV2SendRewards, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(conquestV2SendRewards))

	silverRewardContractAddress := common.HexToAddress(config.Instance.Contracts.ConquestTreasureSilverRewardsContract)
	silverRewardContractArtifact := abis.LeaderboardRewardFactory

	for _, task := range conquestV2SendRewards {
		var payload ConquestV2SendRewardTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			log.Err(err).Msgf("failed unmarshalling ConquestV2SendRewardTask payload")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		// send silver cards
		if len(payload.SilverCardAmounts) > 0 {
			toAddress := common.HexToAddress(account.Address.String())

			tokenIDs := make([]*big.Int, 0)
			amounts := make([]*big.Int, 0)

			for tokenID, amount := range payload.SilverCardAmounts {
				t := big.Int{}
				t.SetUint64(tokenID)
				tokenIDs = append(tokenIDs, &t)

				a := big.Int{}
				a.SetUint64(amount)
				amounts = append(amounts, &a)
			}

			silverCardsRewardInput, err := silverRewardContractArtifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
			if err != nil {
				log.Error().Msgf("encoding silver cards rewards input failed with: %v", err)
				UpdateFailedTasks([]*data.Task{task}, ConquestV2SendRewardRetryDelay, ConquestV2SendRewardMaxRetries)

				continue
			}

			bundle.Append([]*sequence.Transaction{
				{To: silverRewardContractAddress, Data: silverCardsRewardInput},
			})

			activeTasks = append(activeTasks, task)
		}

		// send USDC
		if payload.AmountUSDC != nil && payload.AmountUSDC.Uint64() > 0 {
			transaction, err := r.contractUSDC.ComposeTransfer(account.Address, payload.AmountUSDC)
			if err != nil {
				log.Err(err).Msg("compose usdc transfer transaction")
				UpdateFailedTasks([]*data.Task{task}, ConquestV2SendRewardRetryDelay, ConquestV2SendRewardMaxRetries)

				continue
			}

			bundle.Append([]*sequence.Transaction{
				contracts.ConvertToSequenceTransaction(transaction),
			})
		}

		activeTasks = append(activeTasks, task)

		amountFloat := float32(payload.AmountUSDC.Int64()) / float32(math.Pow10(6))

		event := &data.FeedEvent{
			FeedEvent: &proto.FeedEvent{
				AccountID:               accountID,
				Type:                    proto.FeedEventType_CONQUEST_V2_REWARD,
				ConquestV2Reward:        &amountFloat,
				ConquestV2TreasureLevel: &payload.TreasureLevel,
			},
		}

		if err := sess.Save(event); err != nil {
			log.Err(err).Msgf("create feed event")
			UpdateFailedTasks([]*data.Task{task}, ConquestV2SendRewardRetryDelay, ConquestV2SendRewardMaxRetries)

			continue
		}

		// Convert silvers amount to integer amounts
		var silverCardAmounts map[uint64]uint64
		if len(payload.SilverCardAmounts) > 0 {
			silverCardAmounts = make(map[uint64]uint64)
			for tokenID, amount := range payload.SilverCardAmounts {
				silverCardAmounts[tokenID] = amount / cardDecimalsMultiplier
			}
		}

		_, err = data.DB.Notifications(sess).CreateConquestV2RewardNotification(&proto.NotificationConquestV2Reward{
			Season:            payload.Season,
			Week:              payload.Week,
			TreasureLevel:     payload.TreasureLevel,
			AmountUSDC:        amountFloat,
			SilverCardAmounts: silverCardAmounts,
		}, accountID, nil, nil)
		if err != nil {
			log.Err(err).Msgf("create conquest reward notification")
			UpdateFailedTasks([]*data.Task{task}, ConquestV2SendRewardRetryDelay, ConquestV2SendRewardMaxRetries)

			continue
		}
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runSkypassConquestTickets(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var conquestTicketsTasks []*data.Task

	for _, task := range tasks {
		if task.Queue == MintSkypassConquestTicketsQueue {
			conquestTicketsTasks = append(conquestTicketsTasks, task)
		}
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(conquestTicketsTasks))

	contractAddress := common.HexToAddress(config.Instance.Contracts.SkypassConquestTicketsFactory)
	artifact := abis.LeaderboardRewardFactory

	if len(conquestTicketsTasks) == 0 {
		return []*sequence.Transaction{}, []*data.Task{}, nil
	}

	for _, task := range conquestTicketsTasks {
		var payload MintSkypassConquestTicketsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintSkypassConquestTicketsDelay, MintSkypassConquestTicketsRetries)
			log.Err(err).Msgf("unmarshalling payload")

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		t := big.Int{}
		t.SetUint64(ConquestTicketV1ID)
		tokenIDs = append(tokenIDs, &t)

		a := big.Int{}
		a.SetUint64(payload.TicketAmount)
		amounts = append(amounts, &a)

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		input, err := artifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Err(err).Msgf("encoding input")
			UpdateFailedTasks([]*data.Task{task}, MintSkypassConquestTicketsDelay, MintSkypassConquestTicketsRetries)

			continue
		}

		bundle.Append([]*sequence.Transaction{
			{To: contractAddress, Data: input},
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runSkypassStickers(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var stickersTasks []*data.Task

	for _, task := range tasks {
		if task.Queue == MintSkypassStickersQueue {
			stickersTasks = append(stickersTasks, task)
		}
	}

	if len(stickersTasks) == 0 {
		return []*sequence.Transaction{}, []*data.Task{}, nil
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(stickersTasks))

	contractAddress := common.HexToAddress(config.Instance.Contracts.SkypassStickersFactory)
	artifact := abis.LeaderboardRewardFactory

	for _, task := range stickersTasks {
		var payload MintSkypassStickersTask
		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintSkypassStickersDelay, MintSkypassStickersRetries)
			log.Err(err).Msgf("unmarshalling payload")

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		for tokenID, amount := range payload.StickerAmounts {
			t := big.Int{}
			t.SetUint64(tokenID)
			tokenIDs = append(tokenIDs, &t)

			a := big.Int{}
			a.SetUint64(amount)
			amounts = append(amounts, &a)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		input, err := artifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Err(err).Msgf("encoding input")
			UpdateFailedTasks([]*data.Task{task}, MintSkypassStickersDelay, MintSkypassStickersRetries)

			continue
		}

		// Append to the list to be returned
		bundle.Append([]*sequence.Transaction{
			{To: contractAddress, Data: input},
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

func (r *SendTxnsRunner) runSkypassSilverCards(sess db.Session, tasks []*data.Task) ([]*sequence.Transaction, []*data.Task, error) {
	var silverCardsTasks []*data.Task

	for _, task := range tasks {
		if task.Queue == MintSkypassSilverCardsQueue {
			silverCardsTasks = append(silverCardsTasks, task)
		}
	}

	bundle := sequence.Transactions{}
	activeTasks := make([]*data.Task, 0, len(silverCardsTasks))

	contractAddress := common.HexToAddress(config.Instance.Contracts.SkypassSilverCardsFactory)
	artifact := abis.LeaderboardRewardFactory

	if len(silverCardsTasks) == 0 {
		return []*sequence.Transaction{}, []*data.Task{}, nil
	}

	for _, task := range silverCardsTasks {
		var payload MintSkypassSilverCardsTask

		err := json.Unmarshal(task.Payload, &payload)
		if err != nil {
			// TODO: if we can't unmarshal, dont bother to retry this..
			UpdateFailedTasks([]*data.Task{task}, MintSkypassSilverCardsDelay, MintSkypassSilverCardsRetries)
			log.Err(err).Msgf("unmarshalling payload")

			continue
		}

		accountID, err := getAccountID(sess, payload.AccountID, payload.AccountAddress)
		if err != nil {
			log.Err(err).Msgf("get account ID")
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		tokenIDs := make([]*big.Int, 0)
		amounts := make([]*big.Int, 0)

		for tokenID, amount := range payload.CardAmounts {
			t := big.Int{}
			t.SetUint64(tokenID)
			tokenIDs = append(tokenIDs, &t)

			a := big.Int{}
			a.SetUint64(amount)
			amounts = append(amounts, &a)
		}

		account, err := data.DB.Accounts(sess).FindByID(accountID)
		if err != nil {
			log.Err(err).Msgf("find account %d", accountID)
			UpdateFailedTasks([]*data.Task{task}, 0, 0)

			continue
		}

		toAddress := common.HexToAddress(account.Address.String())

		silverCardRewardInput, err := artifact.Encode("batchMint", toAddress, tokenIDs, amounts, []byte(nil))
		if err != nil {
			log.Err(err).Msgf("encoding input")
			UpdateFailedTasks([]*data.Task{task}, MintSkypassSilverCardsDelay, MintSkypassSilverCardsRetries)

			continue
		}

		bundle.Append([]*sequence.Transaction{
			{To: contractAddress, Data: silverCardRewardInput},
		})

		activeTasks = append(activeTasks, task)

		UpdateCompletedTasks([]*data.Task{task})
	}

	return bundle, activeTasks, nil
}

type ConquestStateManager interface {
	Complete(ctx context.Context, sess db.Session, accountID proto.AccountID, conquestID uint64) error
}

type ContractUSDC interface {
	Address() proto.Hash
	ComposeTransfer(to proto.Hash, value *big.Int) (*proto.OnChainTransaction, error)
	FindAndDecodeTransferEvent(log *types.Log) (*contracts.ERC20TransferEvent, error)
}

type ContractOpenSkyAssets interface {
	Address() proto.Hash
	ComposeSafeBatchTransferFrom(from, to proto.Hash, tokens map[uint64]uint64, data []byte) (*proto.OnChainTransaction, error)
	FindAndDecodeTransferBatchEvent(log *types.Log) (*contracts.ERC1155TransferBatchEvent, error)
}
