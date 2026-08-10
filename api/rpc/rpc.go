package rpc

import (
	"context"
	"time"

	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/go-ethauth"
	"github.com/0xsequence/go-sequence"
	seqAPI "github.com/0xsequence/go-sequence/api"
	v1 "github.com/0xsequence/go-sequence/core/v1"
	seqIndexer "github.com/0xsequence/go-sequence/indexer"
	"github.com/go-chi/jwtauth/v5"
	"github.com/goware/cachestore"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/mailchimp"
	"github.com/horizon-games/OpenSky/api/proto"
	rpcmw "github.com/horizon-games/OpenSky/api/rpc/middleware"
	"github.com/horizon-games/OpenSky/api/rpc/rctx"
)

type Server struct {
	Config      *config.Config
	JWTAuth     *jwtauth.JWTAuth
	ETHAuth     *ethauth.ETHAuth
	ETHProvider *ethrpc.Provider

	SequenceAPI     seqAPI.API
	SequenceIndexer seqIndexer.IndexerClient
	SequenceRelayer sequence.Relayer
	Wallet          *sequence.Wallet[*v1.WalletConfig]

	MatchRecorder    MatchRecorder
	Mailchimp        *mailchimp.Mailchimp
	Analytics        analytics.Tracker
	MetricsCollector MetricsCollector

	AccountRegisterer AccountRegisterer

	ConquestStateManager         ConquestStateManager
	ConquestAccountStatUpdater   ConquestAccountStatUpdater
	ConquestV2PointsUpdater      ConquestV2PointsUpdater
	ConquestV2PoolManager        ConquestV2PoolManager
	ConquestV2SummaryGetter      ConquestV2SummaryGetter
	ConquestV2TreasureCalculator ConquestV2TreasureCalculator
	ConquestV2PointsCalculator   ConquestV2PointsCalculator

	DeckUpdater DeckUpdater

	SkypassRewardLister  SkypassRewardLister
	SkypassRewardClaimer SkypassRewardClaimer
	SkypassRewardUpdater SkypassRewardUpdater

	QuestLister   QuestsLister
	QuestClaimer  QuestsClaimer
	QuestReRoller QuestsReRoller
	QuestUpdater  QuestUpdater

	OneTimeNotificationChecker OneTimeNotificationChecker

	MatchPlayerRankUpper     MatchPlayerRankUpper
	GrandmastersRecalculator GrandmastersRecalculator
	Leveller                 Leveller
	MatchXPAwarder           MatchXPAwarder
	MatchXPUpdater           MatchXPUpdater
	DeckRankUpdater          DeckRankUpdater

	PaymentProviderResponseVerifier PaymentProviderResponseVerifier
	PaymentIntentCreator            PaymentIntentCreator
	OnChainTransactionComposer      OnChainTransactionComposer

	CrystalGetter CrystalGetter

	HeroSkinFinder HeroSkinFinder

	AccountAssetTransferer AccountAssetTransferer

	ContractUSDC ContractUSDC

	TwitchClient  TwitchClient
	DiscordClient DiscordClient

	CacheStore cachestore.Store[[]byte]
}

// Ping is a healthcheck that returns an empty message.
func (s *Server) Ping(ctx context.Context) (bool, error) {
	repo := rctx.DBContext(ctx)

	err := repo.Ping()
	if err != nil {
		return false, proto.WrapFailf(err, "ping failed")
	}

	col := repo.Collection("accounts")
	exists, err := col.Exists()
	if err != nil {
		return false, proto.WrapFailf(err, "ping failed")
	}
	if !exists {
		return false, proto.Failf("necessary table does not exist, db issue.")
	}

	return true, nil
}

// Version returns service version details
func (s *Server) Version(ctx context.Context) (*proto.Version, error) {
	return &proto.Version{
		WebrpcVersion: proto.WebRPCVersion(),
		SchemaVersion: proto.WebRPCSchemaVersion(),
		SchemaHash:    proto.WebRPCSchemaHash(),
		AppVersion:    s.Config.GitCommit,
	}, nil
}

func (s *Server) Clock(ctx context.Context) (time.Time, error) {
	now := time.Now()
	return now, nil
}

func (s *Server) validateAccountAndGetAddress(ctx context.Context, targetAddress *string) (proto.AccountID, error) {
	logger := rctx.Logger(ctx)
	repo := rctx.DBContext(ctx)

	if targetAddress != nil &&
		(rctx.SessionTypeContext(ctx) == rpcmw.SessionTypeAdmin || rctx.SessionTypeContext(ctx) == rpcmw.SessionTypeService) {
		address := proto.HashFromString(*targetAddress)

		if !address.IsValidAddress() {
			logger.Error().Stringer("accountAddress", address).Msg("invalid address")
			return 0, proto.ErrorInternal("invalid address")
		}

		account, err := data.DB.Accounts(repo).FindByAddress(address)
		if err != nil {
			logger.Err(err).Msgf("find account %s", address)
			return 0, proto.ErrorInternal("find account failed")
		}

		return account.ID, nil
	}

	account, ok := rctx.CurrentAccount(ctx)
	if !ok {
		return 0, proto.ErrorInvalidArgument("session", "missing account")
	}

	return account.ID, nil
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/match_recorder.go -package mock . MatchRecorder
type MatchRecorder interface {
	UploadArchiveRecords(matchID uint64, index int64, jsonStringData string) error
	ArchiveURI(matchID uint64, index int64) string
	LiveURI(matchID uint64, index int64) string
	GetSignedRecordsURLs(matchID uint64, expiration time.Duration) ([]string, error)
}

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackMatchEnd(*data.Match)
}

// GrandmasterUpdater updates the grandmaster's listing
//
//go:generate go run go.uber.org/mock/mockgen -destination ./mock/grandmasters_recalculator.go -package mock . GrandmastersRecalculator
type GrandmastersRecalculator interface {
	Recalculate(sess db.Session, season uint16) error
}
