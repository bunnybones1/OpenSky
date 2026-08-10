package jobqueue

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/url"
	"strings"
	"time"

	"github.com/0xsequence/ethkit/ethrpc"
	seqIndexer "github.com/0xsequence/go-sequence/indexer"
	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/honeybadger-io/honeybadger-go"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// BalanceSyncRunner is responsible for syncing the OpenSky asset balances from the
// Sequence Polygon Indexer to the local OpenSky database. We poll the remote indexer
// service, for new updates since our `last_update_id` cursor.

// NOTE: for the dev2-polygon2-indexer, the "update_id" column is new, and for many records it will be set
// to 0, which will break the syncing. This is just a temporary problem, but for any contract we're testing
// we can run:
// update token_balances set update_id=id where contract_address='\XXX' and update_id=0;
// in the sequence indexer db.
// TODO: eventually remove this note.

var _ Runner = &BalanceSyncRunner{}

const (
	BalanceSyncWorkGroup  = "balance-sync"
	BalanceSyncRetryDelay = 15 // number of seconds
	BalanceSyncMaxRetries = 20

	balanceSyncMetricsProcessLabel = "balance-sync"
)

type BalanceSyncTask struct {
	LastBlockIDs    map[proto.ContractType]uint64 `json:"last_block_ids,omitempty"`
	LastBlockHashes map[proto.ContractType]string `json:"last_block_hashes,omitempty"`
}

func (t BalanceSyncTask) Hash() string {
	return "balance-sync"
}

type BalanceSyncRunner struct {
	sequenceIndexer  seqIndexer.IndexerClient
	contractIndex    map[string]proto.ContractType
	ticker           *time.Ticker
	provider         *ethrpc.Provider
	metricsCollector MetricsCollector
}

func (r *BalanceSyncRunner) Queues() []string {
	return []string{BalanceSyncWorkGroup}
}

func (r *BalanceSyncRunner) WorkGroup() string {
	return BalanceSyncWorkGroup
}

func (r *BalanceSyncRunner) MaxBatchSize() int {
	return 2
}

func (r *BalanceSyncRunner) Tick() <-chan time.Time {
	if r.ticker == nil {
		r.ticker = time.NewTicker(500 * time.Millisecond)
	}
	return r.ticker.C
}

func NewBalanceSyncRunner(metricsCollector MetricsCollector) (*BalanceSyncRunner, error) {
	cfg := config.Instance

	if !prototyp.Hash(cfg.Contracts.SkyweaverAssetsContract).IsValidAddress() {
		return nil, errors.Errorf("balancesync: opensky_assets_contract in config is invalid")
	}
	if !prototyp.Hash(cfg.Contracts.USDCContract).IsValidAddress() {
		return nil, errors.Errorf("balancesync: usdc_contract in config is invalid")
	}

	runner := &BalanceSyncRunner{
		metricsCollector: metricsCollector,
	}

	// Sequence Indexer client
	runner.sequenceIndexer = seqIndexer.NewIndexer(cfg.Sequence.IndexerURL, cfg.Sequence.AccessKey)

	// Contract index
	runner.contractIndex = map[string]proto.ContractType{}
	runner.contractIndex[strings.ToLower(cfg.Contracts.SkyweaverAssetsContract)] = proto.ContractType_SKYWEAVER_ASSETS

	// NOTE: we don't want to index USDC/DAI contracts, as it would mean we're indexing all
	// accounts which interact with the contract, which is way more than we care about.
	// Instead, for USDC, since its a single balance we just query this on-chain and cache it
	// at the rpc endpoint level.

	provider, _ := ethrpc.NewProvider(cfg.Ethereum.URL)
	runner.provider = provider

	return runner, nil
}

func (r *BalanceSyncRunner) RunTasks(ctx context.Context, sess db.Session, tasks []*data.Task) error {
	oplog := log.With().Str("op", BalanceSyncWorkGroup).Logger()
	oplog.Info().Msgf("%s running", BalanceSyncWorkGroup)

	task := tasks[0]
	var payload BalanceSyncTask
	err := json.Unmarshal(task.Payload, &payload)
	if err != nil {
		err := errors.Wrap(err, "failed to unmarshal balance sync payload - this breaks balance sync!")
		hbParams := url.Values{}
		hbParams.Set("payload", fmt.Sprintf("%v", task.Payload))

		if _, err := honeybadger.Notify(err, honeybadger.Params(hbParams)); err != nil {
			log.Err(err).Msg("notify with honey badger")
		}

		log.Err(err).Msg("failed unmarshalling balance sync payload")
		UpdatePausedTasks([]*data.Task{task})

		return nil
	}

	if payload.LastBlockIDs == nil {
		payload.LastBlockIDs = map[proto.ContractType]uint64{}
	}
	if payload.LastBlockHashes == nil {
		payload.LastBlockHashes = map[proto.ContractType]string{}
	}

	// true if any balances were updated as a result of this sync - if false there is nothing to update other than sync task
	balancesUpdated := false

	// Fetch balance updates from Sequence Indexer using the block number as a cursor for unsynced updates and block hash as means of reorg detection
syncloop:
	for tokenContractAddress, contractType := range r.contractIndex {
		oplog.Info().Msgf("querying balances for %s %s", contractType, tokenContractAddress)

		if contractType != proto.ContractType_SKYWEAVER_ASSETS {
			oplog.Error().Msgf("unknown contractType %s, balance sync logic is not prepared for it, skipping", contractType)
			continue
		}

		lastBlockID := payload.LastBlockIDs[contractType]
		var lastBlockHash *string
		if hash, ok := payload.LastBlockHashes[contractType]; ok {
			lastBlockHash = &hash
		}
		var balanceUpdates, balances []*seqIndexer.TokenBalance

		// true if have we fetched balance updates for at least one full block:
		// - balance update batch has no next page (empty cursor), or
		// - balance update batch or batches contain updates for more than one block and we're discarding updates for the last one
		completeBlock := false

		pageSize := uint32(2000)
		queryPage := &seqIndexer.Page{PageSize: &pageSize}

		// since results for a single block can span multiple pages we have to fetch multiple pages and only save the part of values that we can guarantee
		// cover all updates for a block or blocks
		for i := 0; i < 10; i++ {
			// fetch a page of results
			queryPage, balances, err = r.sequenceIndexer.GetBalanceUpdates(context.Background(), tokenContractAddress, lastBlockID, lastBlockHash, queryPage)
			if err != nil {
				// this is a reorg, roll back 200 blocks and try again
				if strings.Contains(err.Error(), "provided block hash does not match") ||
					strings.Contains(err.Error(), "provided block does not exist") {
					oplog.Warn().Msgf("block hash doesn't match block number - rolling back, reason: %v", err.Error())

					n := lastBlockID - 200
					payload.LastBlockIDs[contractType] = n

					blockHash, err := r.provider.BlockByNumber(ctx, big.NewInt(0).SetUint64(n))
					if err != nil {
						oplog.Warn().Msgf("error fetching block hash for block number %d due to %v", n, err)
					}

					delete(payload.LastBlockHashes, contractType)

					if blockHash != nil {
						payload.LastBlockHashes[contractType] = blockHash.Hash().String()
						oplog.Warn().Msgf("GetBalanceUpdates, going to continue with block num %d and hash %s", payload.LastBlockIDs[contractType], payload.LastBlockHashes[contractType])
					}
					val, _, err := data.ProcessTaskPayload(payload)
					if err != nil {
						oplog.Warn().Msgf("Updating update task payload with new block number and hash: %v", err)
						continue syncloop
					}
					task.Payload = val

					continue syncloop
				}
				oplog.Error().Msgf("failed to query indexer GetBalanceUpdates: %v", err)
				UpdateFailedTasks([]*data.Task{task}, BalanceSyncRetryDelay, BalanceSyncMaxRetries)

				continue syncloop
			}

			// if there is no error and no balances are empty then you are up to date - exit loop early
			// it also means we got all updates for a block
			if len(balances) == 0 {
				completeBlock = true

				runtimeStatus, err := r.sequenceIndexer.RuntimeStatus(context.Background())
				if err != nil {
					oplog.Err(err).Msgf("sequence indexer runtime status")
				} else {
					if runtimeStatus != nil && runtimeStatus.Checks != nil {
						r.metricsCollector.TrackLastBlockNumber(balanceSyncMetricsProcessLabel, runtimeStatus.Checks.LastBlockNum)
					}
				}

				break
			}

			balanceUpdates = append(balanceUpdates, balances...)

			if queryPage.More != nil && !*queryPage.More {
				completeBlock = true

				runtimeStatus, err := r.sequenceIndexer.RuntimeStatus(context.Background())
				if err != nil {
					oplog.Err(err).Msgf("sequence indexer runtime status")
				} else {
					if runtimeStatus != nil && runtimeStatus.Checks != nil {
						r.metricsCollector.TrackLastBlockNumber(balanceSyncMetricsProcessLabel, runtimeStatus.Checks.LastBlockNum)
					}
				}

				break
			}
		}

		if len(balanceUpdates) == 0 {
			oplog.Debug().Msgf("ok, but no balance updates for contract %s at this time", contractType.String())
			continue
		}

		oplog.Debug().Msgf("processing %d balance updates for contract %s", len(balanceUpdates), contractType.String())

		// find the last complete block if empty page was not returned
		if !completeBlock {
			completeBlockEnd := -1
			currentMaxBlockNum := balanceUpdates[0].BlockNumber

			for i, update := range balanceUpdates {
				if update.BlockNumber > currentMaxBlockNum {
					completeBlockEnd = i
					currentMaxBlockNum = update.BlockNumber
				}
			}

			if completeBlockEnd < 0 {
				oplog.Error().Msg("failed to fetch updates for at least one full block GetBalanceUpdates")
				UpdateFailedTasks([]*data.Task{task}, BalanceSyncRetryDelay, BalanceSyncMaxRetries)
				continue
			}

			balanceUpdates = balanceUpdates[0:completeBlockEnd]
		}

		if len(balanceUpdates) > 0 {
			lastBlockID = balanceUpdates[len(balanceUpdates)-1].BlockNumber
			hash := balanceUpdates[len(balanceUpdates)-1].BlockHash.Hash().String()
			lastBlockHash = &hash
		}

		var batch []data.ItemBalanceUpdate

		for _, b := range balanceUpdates {
			if !b.TokenID.Int().IsUint64() {
				oplog.Warn().Msgf("balancesync: token outside of uint64 range. token ID: %s", b.TokenID.String())
				continue
			}

			// NOTE: we are converting the tokenID to the itemID and instead marking the type of grade.
			// This is fine as we can deterministically convert between numbers, and makes things a bit easier
			// when querying against our card library.
			itemType, itemID, err := data.SWTokenID2TypeAndItemID(b.TokenID.Uint64())
			if err != nil {
				oplog.Warn().Msgf("balancesync: unknown opensky token type, token ID: %d", b.TokenID.Uint64())
				continue
			}

			// filter for gold and silver cards with less than
			// two decimals in the amount
			balance := itemFilterDecimals(itemType, &b.Balance)
			if balance == nil {
				continue
			}

			// track if balances of any contract were updated in this task
			balancesUpdated = true

			batch = append(batch, data.ItemBalanceUpdate{
				AccountAddress:  proto.Hash(b.AccountAddress.Hash),
				ContractAddress: proto.Hash(b.ContractAddress),
				ItemType:        uint(itemType),
				TokenID:         itemID,
				Balance:         *balance,
			})

			// Unequip when the balance goes to zero or less.
			if balance.Lte(big.NewInt(0)) {
				account, err := data.DB.Accounts(sess).FindByAddress(proto.Hash(strings.ToLower(b.AccountAddress.Hash.String())))
				if err != nil {
					if !errors.Is(err, db.ErrNoMoreRows) {
						oplog.Err(err).Msgf("find account with address %s", strings.ToLower(b.AccountAddress.Hash.String()))
					}

					continue
				}

				if account != nil {
					item := &data.Item{Item: &proto.Item{
						AccountID: account.ID,
						ItemType:  itemType,
						TokenID:   itemID,
					}}
					if err := data.DB.ItemsEquipped(sess).Unequip(item); err != nil {
						oplog.Err(err).Msgf("uneqip item, account: %d, item_type: %s, token ID: %d", item.AccountID, item.ItemType, item.TokenID)
					}
				}
			}
		}

		if len(batch) > 0 {
			if err := data.DB.Items(sess).BulkBalanceUpdate(batch); err != nil {
				oplog.Err(err).Msgf("bulk balance update")
				UpdateFailedTasks([]*data.Task{task}, BalanceSyncRetryDelay, BalanceSyncMaxRetries)
				continue
			}
		}

		num := len(balanceUpdates)
		if num > 0 && balancesUpdated {
			v := balanceUpdates[num-1]
			oplog.Info().Msgf("synced %d %s balance changes up to block %d", len(balanceUpdates), contractType, v.BlockNumber)
		}

		payload.LastBlockIDs[contractType] = lastBlockID
		payload.LastBlockHashes[contractType] = *lastBlockHash

		r.metricsCollector.TrackLastBlockNumber(balanceSyncMetricsProcessLabel, lastBlockID)
	}

	var runAt time.Time
	taskEndTime := time.Now().UTC()

	if balancesUpdated {
		p, hash, err := data.ProcessTaskPayload(payload)
		if err != nil {
			return err
		}
		task.Payload = p
		task.Hash = &hash

		// balances updated => we're likely behind => run again in 0.5 seconds
		runAt = taskEndTime.Add(500 * time.Millisecond)
		r.ticker.Reset(time.Second)

	} else {
		// no balances updated => no backlog => pause for 2 seconds before next check
		runAt = taskEndTime.Add(2 * time.Second)
		r.ticker.Reset(2 * time.Second)
	}

	for _, task := range tasks {
		task.Try = 0
		task.RunAt = &runAt
	}

	return nil
}

var decimals = new(big.Int).SetUint64(100)

func itemFilterDecimals(t proto.ItemType, balance *prototyp.BigInt) *prototyp.BigInt {
	// TODO: Skins
	if t != proto.ItemType_SW_GOLD_CARDS &&
		t != proto.ItemType_SW_SILVER_CARDS &&
		t != proto.ItemType_SW_CONQUEST_TICKET &&
		t != proto.ItemType_SW_CRYSTALS &&
		t != proto.ItemType_SW_STICKERS &&
		t != proto.ItemType_SW_HERO_SKINS &&
		t != proto.ItemType_SW_CARD_BACKS {
		return balance
	}

	// any card that is exchanged on niftyswap exchange (i.e. gold cards) includes
	// two decimal points. For example, owning 1 gold card A means that
	// our balance for A is 100.
	// We round down for the owning of cards, this is, owning 290 assets of card A
	// means that you own 2 cards.
	// This function serves as a translator between the amount shown in
	// the ethereum blockchain with decimals (290) and the amount
	// we show to the user (2)

	applyDecimals := func(i *prototyp.BigInt) {
		m := new(big.Int).Set(i.Int())
		if m.IsUint64() {
			if m.Uint64() < decimals.Uint64() {
				// zero
				(*i) = prototyp.NewBigInt(0)
				return
			}
		}
		m.Div(m, decimals)
		i.Int().Set(m)
	}

	applyDecimals(balance)

	return balance
}
