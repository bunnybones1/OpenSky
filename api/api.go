package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/0xsequence/go-ethauth"
	"github.com/0xsequence/go-sequence"
	seqAPI "github.com/0xsequence/go-sequence/api"
	v1 "github.com/0xsequence/go-sequence/core/v1"
	seqIndexer "github.com/0xsequence/go-sequence/indexer"
	seqRelayer "github.com/0xsequence/go-sequence/relayer"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httplog"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-chi/telemetry"
	"github.com/goware/cachestore"
	"github.com/goware/cachestore/memlru"
	"github.com/goware/cachestore/redis"
	"github.com/goware/logadapter-zerolog"
	"github.com/honeybadger-io/honeybadger-go"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/accounts"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/conquest"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/contracts/abis"
	"github.com/horizon-games/OpenSky/api/lib/decks"
	"github.com/horizon-games/OpenSky/api/lib/discord"
	"github.com/horizon-games/OpenSky/api/lib/levels/xp"
	"github.com/horizon-games/OpenSky/api/lib/matchrecords"
	"github.com/horizon-games/OpenSky/api/lib/metrics"
	"github.com/horizon-games/OpenSky/api/lib/notification/onetimenotification"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/lib/payments/appleappstore"
	"github.com/horizon-games/OpenSky/api/lib/payments/googleplay"
	"github.com/horizon-games/OpenSky/api/lib/payments/samsunggalaxystore"
	"github.com/horizon-games/OpenSky/api/lib/payments/stripe"
	"github.com/horizon-games/OpenSky/api/lib/quests"
	"github.com/horizon-games/OpenSky/api/lib/rankup"
	"github.com/horizon-games/OpenSky/api/lib/rankup/grandmasters"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
	"github.com/horizon-games/OpenSky/api/lib/twitch"
	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/api/rpc"
	rpcmw "github.com/horizon-games/OpenSky/api/rpc/middleware"
)

var (
	VERSION         = "dev"
	GITBRANCH       = "branch"
	GITCOMMIT       = "last commit"
	GITCOMMITDATE   = "last change"
	GITCOMMITAUTHOR = "last author"
)

type Context struct {
	context.Context
	stopFn context.CancelFunc

	Config *config.Config
}

var _ context.Context = &Context{}

func NewContext() *Context {
	ctx, stopFn := context.WithCancel(context.Background())
	return &Context{
		Context: ctx,
		stopFn:  stopFn,
	}
}

type API struct {
	ctx *Context

	Config *config.Config
	Log    zerolog.Logger
	HTTP   *http.Server
	RPC    *rpc.Server

	JWTAuth *jwtauth.JWTAuth
	ETHAuth *ethauth.ETHAuth

	Analytics *analytics.Analytics

	SequenceAPI     seqAPI.API
	SequenceIndexer seqIndexer.IndexerClient
	SequenceRelayer sequence.Relayer
}

func New(cfg *config.Config) (*API, error) {
	err := cfg.Load()
	if err != nil {
		return nil, err
	}
	cfg.GitCommit = GITCOMMIT
	config.Instance = cfg

	// Server ctx
	serverCtx := NewContext()
	serverCtx.Config = cfg

	// Logging
	logger := httplog.NewLogger(cfg.Service.Name, httplog.Options{
		LogLevel:       cfg.Logging.Level,
		LevelFieldName: "severity",
		JSON:           cfg.Logging.JSON,
		Concise:        cfg.Logging.Concise,
		Tags: map[string]string{
			"serviceVersion": GITCOMMIT,
		},
	})

	// JWT Token auth
	jwtAuth := jwtauth.New("HS256", []byte(cfg.Auth.JWTSecret), nil, jwt.WithAcceptableSkew(5*time.Minute))

	// First season start
	if cfg.OpenSky.FirstSeasonStartOverride != "" {
		firstSeasonStart, err := time.Parse(time.RFC3339, cfg.OpenSky.FirstSeasonStartOverride)
		if err != nil {
			return nil, errors.Wrap(err, "config error: first_season_start_override not empty, but in invalid format. RFC3339 format required")
		}
		data.OverrideFirstSeasonStart(firstSeasonStart)
	}

	// Database
	if _, err := data.NewDBSession(cfg.DB); err != nil {
		return nil, errors.Wrap(err, "failed to connect to main DB")
	}
	err = data.DB.Ping()
	if err != nil {
		return nil, err
	}

	// Custom logger
	db.LC().SetLogger(&data.QueryLogger{Logger: logger})

	// Cards index
	data.CardIndex.SetImageBaseURL(cfg)

	if err := data.CardIndex.Sync(); err != nil {
		return nil, errors.Wrap(err, "failed to sync cards index from the DB")
	}

	// set up analytics tracker
	analyticsTracker, err := analytics.NewAnalytics(
		cfg.Analytics,
		logger,
		analytics.PolicyChecker(data.DB.CookiePolicies()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize analytics tracker: %w", err)
	}

	if err = analyticsTracker.Run(serverCtx); err != nil {
		return nil, fmt.Errorf("failed to run analytics tracker service: %w", err)
	}

	// Honeybadger - error reporting service
	if cfg.Honeybadger.APIKey != "" {
		honeybadger.Configure(honeybadger.Configuration{
			APIKey: cfg.Honeybadger.APIKey,
			Env:    cfg.Mode.String(),
			Sync:   false, // send errors in the background, async
		})
		honeybadger.SetContext(honeybadger.Context{
			"RELEASE": GITCOMMIT,
			"ENV":     cfg.Mode.String(),
		})
	}

	// MatchRecorder (stored on AWS-S3 and GCP Store)
	matchRecords, err := matchrecords.NewCombinedMatchRecords(cfg.GCPStorage, cfg.S3)
	// in case of an error, log it, but do not prevent server from booting
	if err != nil {
		log.Warn().Msgf("matchrecords fail: %v, skipping..", err)
	}

	// Ethereum provider
	provider, err := ethrpc.NewProvider(cfg.Ethereum.URL)
	if err != nil {
		return nil, errors.New("can't instantiate ethprovider")
	}

	// Sequence
	sequenceAPI := seqAPI.NewAPI(cfg.Sequence.AccessKey, seqAPI.Options{
		APIServiceURL: cfg.Sequence.APIURL,
	})
	sequenceIndexer := seqIndexer.NewIndexer(cfg.Sequence.IndexerURL, cfg.Sequence.AccessKey)

	sequenceRelayer, err := seqRelayer.NewRpcRelayer(cfg.Sequence.RelayerURL, cfg.Sequence.AccessKey, provider, nil)
	if err != nil {
		return nil, fmt.Errorf("new api failed, relayer: %w", err)
	}

	// ETHAuth
	ethAuth, err := ethauth.New(sequence.ValidateSequenceAccountProof(logadapter.LogAdapter(logger)))
	if err != nil {
		return nil, fmt.Errorf("new api failed, ethauth: %w", err)
	}
	err = ethAuth.ConfigJsonRpcProvider(cfg.Ethereum.AuthChainURL)
	if err != nil {
		return nil, err
	}

	// Wallet
	var wallet *sequence.Wallet[*v1.WalletConfig]
	if cfg.Wallet.PrivateMnemonic == "" {
		log.Warn().Msgf("Wallet not set in the config file. We will not be able to send weekly rewards")
	} else {
		var err error
		if wallet, err = config.InstantiateWallet(cfg.Wallet, provider, sequenceRelayer); err != nil {
			return nil, err
		}
		log.Info().Msgf("Using sequence wallet %s to send rewards", wallet.Address().String())
	}

	// Cache Store
	var cacheStore cachestore.Store[[]byte]
	if cfg.Redis.Enabled {
		cacheStore, err = redis.New[[]byte](&cfg.Redis)
		if err != nil {
			return nil, fmt.Errorf("initiate Redis cache")
		}
	} else {
		cacheStore, err = memlru.New[[]byte]()
		if err != nil {
			return nil, fmt.Errorf("initiate memory cache")
		}
	}

	// HTTP Server
	httpServer := &http.Server{
		Addr:              cfg.Service.Listen,
		ReadTimeout:       5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       45 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}

	metricsCollector := metrics.NewPrometheusCollector()

	conquestV2PointsCalculator := conquestv2.NewPointsCalculator(
		conquestv2.NewCardPointsCalculator(),
		data.NewHeroSkinFinder(),
	)

	// analytics.ConquestV2PointsCalculator = conquestV2PointsCalculator
	conquestV2TreasureLevelSummaryGetter := conquestv2.NewTreasureLevelSummaryGetter()
	conquestV2PoolManager := conquestv2.NewPoolManager(
		cfg.OpenSky.ConquestV2Config,
		logger,
		cacheStore,
		conquestV2TreasureLevelSummaryGetter,
		metricsCollector,
	)
	conquestV2TreasureCalculator := conquestv2.NewTreasureCalculator(conquestV2PoolManager)
	conquestV2SummaryGetter := conquestv2.NewSummaryGetter(conquestV2PoolManager, conquestV2TreasureLevelSummaryGetter)
	conquestV2PointsUpdater := conquestv2.NewPointsUpdater(
		conquestV2TreasureCalculator,
		conquestV2PointsCalculator,
		analyticsTracker,
	)

	skypassRewardLister := skypass.NewLister(skypass.NewSamsungListerRuleApplier())
	skypassRewardApplier := skypass.NewRewardApplier(data.CardIndex, metricsCollector)
	skypassRewardClaimer := skypass.NewClaimer(skypassRewardLister, skypassRewardApplier)

	grandmasterListUpdater := grandmasters.NewUpdater()

	googlePlayClient, err := googleplay.NewClient(cfg.OpenSky.MobileIAP, http.DefaultClient)
	if err != nil {
		log.Err(err).Msgf("initiate Google Play client: %v", err)
	}

	itemTokenGetter := payments.NewItemTokenGetterImpl()

	paymentProviderResponseVerifier := payments.NewProviderResponseVerifier(
		googlePlayClient,
		appleappstore.NewClient(cfg.OpenSky.MobileIAP, http.DefaultClient),
		samsunggalaxystore.NewClient(cfg.OpenSky.MobileIAP, http.DefaultClient),
		payments.NewProviderProductConverter(),
		itemTokenGetter,
		payments.NewItemGainer(),
		analyticsTracker,
		metricsCollector,
	)

	stripeClient := stripe.NewClient(cfg.OpenSky.Stripe, http.DefaultClient)

	contractUSDC, err := contracts.NewERC20(
		abis.USDCRewardFactory,
		cfg.Contracts.USDCContract,
		provider,
	)
	if err != nil {
		return nil, fmt.Errorf("instantiate usdc contract: %w", err)
	}

	contractOpenSkyAssets, err := contracts.NewERC1155(
		abis.OpenSkyAssets,
		cfg.Contracts.SkyweaverAssetsContract,
	)
	if err != nil {
		return nil, fmt.Errorf("instantiate opensky assets contract: %w", err)
	}

	contractPaymentProxy, err := contracts.NewPaymentProxy(
		abis.PaymentProxyFactory,
		cfg.Contracts.PaymentContract,
		provider,
	)
	if err != nil {
		return nil, fmt.Errorf("instantiate payment proxy contract: %w", err)
	}

	onChainTransactionComposer := payments.NewOnChainTransactionComposer(
		payments.NewProviderProductConverter(),
		itemTokenGetter,
		contractUSDC,
		contractOpenSkyAssets,
		contractPaymentProxy,
	)

	matchPlayerRankUpper := rankup.NewMatchPlayerRankUpper(grandmasterListUpdater)

	leveller := xp.NewLeveller(logger, analyticsTracker, matchPlayerRankUpper)
	matchXPUpdater := xp.NewUpdater(leveller)

	grandmastersRecalculator := rankup.NewGrandmastersRecalculator(grandmasterListUpdater)

	questsDueChecker := quests.NewDueChecker()
	questsRoller := quests.NewAssigner(metricsCollector)
	questsReRoller := quests.NewReRoller(logger, analyticsTracker, questsDueChecker, questsRoller, metricsCollector)
	questsClaimer := quests.NewClaimer(logger, analyticsTracker, quests.NewRewardApplier(matchXPUpdater), questsDueChecker, questsReRoller, questsRoller, metricsCollector)
	questsLister := quests.NewLister(logger, questsDueChecker, questsReRoller, questsRoller)

	accountAssetTransferer := accounts.NewAssetTransferer(contractUSDC, contractOpenSkyAssets)

	questUpdater := quests.NewUpdater(logger, analyticsTracker)

	accountRegisterer := accounts.NewRegisterer(
		cfg,
		logger,
		accounts.NewNameGenerator(logger),
		analyticsTracker,
	)

	// RPC Server
	rpcServer := &rpc.Server{
		Analytics:                       analyticsTracker,
		MetricsCollector:                metricsCollector,
		CacheStore:                      cacheStore,
		Config:                          cfg,
		AccountRegisterer:               accountRegisterer,
		ConquestAccountStatUpdater:      conquest.NewAccountStatUpdater(conquest.NewScoreCalculator()),
		ConquestStateManager:            conquest.NewStateManager(cfg.OpenSky.ConquestV2Config, metricsCollector),
		ConquestV2PointsCalculator:      conquestV2PointsCalculator,
		ConquestV2PointsUpdater:         conquestV2PointsUpdater,
		ConquestV2PoolManager:           conquestV2PoolManager,
		ConquestV2SummaryGetter:         conquestV2SummaryGetter,
		ConquestV2TreasureCalculator:    conquestV2TreasureCalculator,
		DeckUpdater:                     decks.NewUpdater(logger),
		DiscordClient:                   discord.NewClient(http.DefaultClient, cfg.Discord.InfoURL),
		ETHAuth:                         ethAuth,
		ETHProvider:                     provider,
		GrandmastersRecalculator:        grandmastersRecalculator,
		JWTAuth:                         jwtAuth,
		MatchPlayerRankUpper:            matchPlayerRankUpper,
		Leveller:                        leveller,
		MatchXPAwarder:                  xp.NewAwarder(cfg.OpenSky),
		MatchXPUpdater:                  matchXPUpdater,
		DeckRankUpdater:                 decks.NewAsyncRankUpdater(),
		MatchRecorder:                   matchRecords,
		SequenceAPI:                     sequenceAPI,
		SequenceIndexer:                 sequenceIndexer,
		SequenceRelayer:                 sequenceRelayer,
		SkypassRewardClaimer:            skypassRewardClaimer,
		SkypassRewardLister:             skypassRewardLister,
		SkypassRewardUpdater:            skypass.NewCSVRewardUpdater(cfg.OpenSky.SkypassConfig),
		QuestLister:                     questsLister,
		QuestClaimer:                    questsClaimer,
		QuestReRoller:                   questsReRoller,
		QuestUpdater:                    questUpdater,
		OneTimeNotificationChecker:      onetimenotification.NewNotificationChecker(onetimenotification.NewAccountValidator()),
		PaymentProviderResponseVerifier: paymentProviderResponseVerifier,
		PaymentIntentCreator:            payments.NewIntentCreator(stripeClient),
		OnChainTransactionComposer:      onChainTransactionComposer,
		CrystalGetter:                   data.NewCrystalGetter(),
		HeroSkinFinder:                  data.NewHeroSkinFinder(),
		AccountAssetTransferer:          accountAssetTransferer,
		ContractUSDC:                    contractUSDC,
		TwitchClient:                    twitch.NewClient(http.DefaultClient, cfg.Twitch.ClientID),
		Wallet:                          wallet,
	}

	service := &API{
		ctx:             serverCtx,
		Config:          cfg,
		Log:             logger,
		HTTP:            httpServer,
		RPC:             rpcServer,
		JWTAuth:         jwtAuth,
		ETHAuth:         ethAuth,
		SequenceAPI:     sequenceAPI,
		SequenceIndexer: sequenceIndexer,
		SequenceRelayer: sequenceRelayer,
	}

	return service, nil
}

// func InstantiateWallet(config config.WalletConfig, provider *ethrpc.Provider, relayer sequence.Relayer) (*sequence.Wallet, error) {
// 	ownerWallet, err := ethwallet.NewWalletFromMnemonic(config.PrivateMnemonic)
// 	if err != nil {
// 		return nil, err
// 	}
// 	if config.DerivationPath != "" {
// 		_, err = ownerWallet.SelfDerivePathFromString(config.DerivationPath)
// 		if err != nil {
// 			return nil, err
// 		}
// 	}
// 	if config.AccountIndex > 0 {
// 		_, err = ownerWallet.SelfDeriveAccountIndex(config.AccountIndex)
// 		if err != nil {
// 			return nil, err
// 		}
// 	}

// 	// Sequence wallet based on owner private key above
// 	wallet, err := sequence.NewWalletSingleOwner(ownerWallet)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// Set provider on sequence wallet
// 	err = wallet.SetProvider(provider)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// Set relayer on sequence wallet, which is used when the wallet sends transactions
// 	err = wallet.SetRelayer(relayer)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return wallet, nil
// }

func (s *API) Start() error {
	// Start the http server
	r := chi.NewRouter()
	r.Use(middleware.RealIP)

	// HTTP request logger, but skip printing requests to /ping
	r.Use(middleware.Maybe(
		httplog.RequestLogger(s.Log),
		func(r *http.Request) bool {
			if strings.EqualFold(r.URL.Path, "/ping") || strings.EqualFold(r.URL.Path, "/status") {
				return false
			}
			return true
		},
	))

	r.Use(telemetry.Collector(s.Config.Telemetry))
	r.Use(honeybadger.Handler)
	r.Use(middleware.Heartbeat("/ping"))

	// Timeout any request after 28 seconds as Cloudflare has a 30 second limit anyways.
	r.Use(middleware.Timeout(28 * time.Second))

	// Context-aware database session
	r.Use(rpcmw.DBContext)

	// profiling
	if s.Config.Profiling.Enabled {
		authHandler := middleware.BasicAuth(
			"profiling",
			map[string]string{s.Config.Profiling.Username: s.Config.Profiling.Password},
		)
		r.Mount("/debug", authHandler(middleware.Profiler()))
	}

	// status endpoint with basic auth
	r.Group(func(r chi.Router) {
		authHandler := middleware.BasicAuth(
			"status",
			map[string]string{s.Config.Telemetry.Username: s.Config.Telemetry.Password},
		)
		r.Use(authHandler)
		r.Get("/status", s.statusPage())
	})

	// public endpoints
	// r.Group(func(r chi.Router) {
	// 	r.Use(segment.EnsureValidPath(s.Config))

	// 	// Segment proxy to get around adblockers.
	// 	segHandler := segment.NewSegmentReverseProxy()
	// 	r.Handle("/v1/*", segHandler)
	// 	r.Handle("/seg/*", segHandler)
	// 	gtmHandler := segment.NewGoogleTagManagerProxy()
	// 	r.Handle("/gtm/*", gtmHandler)
	// })

	// ACL endpoints
	r.Group(func(r chi.Router) {
		r.Use(corsHandler())

		// Seek and verify JWT tokens, and put on request context
		r.Use(jwtauth.Verifier(s.JWTAuth))

		// Session middleware
		r.Use(rpcmw.Session(s.JWTAuth))

		// IP address history
		r.Use(rpcmw.RecordIPHistory)

		// User agent history
		r.Use(rpcmw.RecordUAHistory)

		// Run lazy migrations
		r.Use(rpcmw.LazyMigrations)

		// Access control
		r.Use(rpcmw.AccessControl)

		// Enforce bans
		r.Use(rpcmw.EnforceAccountBans)

		// Restrict account flagged for deletion
		r.Use(rpcmw.RestrictToDeleteAccounts)

		// Mount webrpc service
		webrpcHandler := proto.NewSkyWeaverAPIServer(s.RPC)
		r.Handle("/*", webrpcHandler)
	})

	// Boot the server and listen for incoming requests
	s.Log.Info().Msgf("OpenSky API - listening on %s", s.HTTP.Addr)
	s.HTTP.Handler = r

	if s.Config.SSL.Cert != "" && s.Config.SSL.Key != "" {
		return s.HTTP.ListenAndServeTLS(s.Config.SSL.Cert, s.Config.SSL.Key)
	} else {
		return s.HTTP.ListenAndServe()
	}
}

// Stop will gracefully shutdown the API server
func (s *API) Stop() {
	s.Log.Info().Msgf("API Service: signaling a stop..")

	s.ctx.stopFn()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.HTTP.Shutdown(ctx); err != nil {
		s.Log.Err(err).Msg("http shutdown")
	}
}

type HealthCheckDetails struct {
	DatabaseCheckOK bool `json:"DatabaseCheckOK"`
}

type LagPerQueue struct {
	QueueName string `json:"queueName"`
	Lag       string `json:"lag"`
}

func (s *API) statusPage() http.HandlerFunc {
	status := struct {
		HealthOK           bool               `json:"healthOK"`
		HealthCheckDetails HealthCheckDetails `json:"healthCheckDetails"`
		StartTime          time.Time          `json:"startTime"`
		Uptime             int64              `json:"uptime"`
		Ver                string             `json:"ver"`
		Branch             string             `json:"branch"`
		CommitHash         string             `json:"commitHash"`
		LagPerTaskQueue    []LagPerQueue      `json:"lagPerTaskQueue"`
	}{
		HealthOK: true,
		HealthCheckDetails: HealthCheckDetails{
			DatabaseCheckOK: true,
		},
		StartTime:       time.Now().UTC(),
		Uptime:          0,
		Branch:          GITBRANCH,
		CommitHash:      GITCOMMIT,
		Ver:             VERSION,
		LagPerTaskQueue: []LagPerQueue{},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := json.Marshal(status)
		if err != nil {
			w.WriteHeader(422)

			if _, err := w.Write([]byte(nil)); err != nil {
				s.Log.Err(err).Msg("status page write body when encoding status fails")
			}

			return
		}
		status.HealthOK = true
		status.HealthCheckDetails.DatabaseCheckOK = true
		status.Uptime = int64(time.Now().UTC().Sub(status.StartTime).Seconds())
		status.LagPerTaskQueue = []LagPerQueue{}

		// perform db query to ensure all is operational
		var account data.Account
		err = data.DB.WithContext(r.Context()).Collection("accounts").Find().One(&account)
		if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
			s.Log.Error().Msgf("API Service: db query check KO: " + err.Error())
			status.HealthOK = false
			status.HealthCheckDetails.DatabaseCheckOK = false
		}

		if status.HealthCheckDetails.DatabaseCheckOK {
			lagDurationQueueArray, err := data.DB.Tasks().GetLagSecondsForAllQueues()
			if err != nil && !errors.Is(err, db.ErrNoMoreRows) {
				s.Log.Error().Msgf("API Service: GetLagSecondsForAllQueues db error: " + err.Error())
				status.HealthOK = false
				status.HealthCheckDetails.DatabaseCheckOK = false
			}

			for _, lagDurationQueue := range lagDurationQueueArray {
				lagPerQueue := &LagPerQueue{
					QueueName: lagDurationQueue.Queue,
					Lag:       fmt.Sprint(time.Duration(lagDurationQueue.Lag) * time.Second),
				}
				status.LagPerTaskQueue = append(status.LagPerTaskQueue, *lagPerQueue)
			}
		}

		w.Header().Set("Content-Type", "application/json")

		if _, err := w.Write(body); err != nil {
			s.Log.Err(err).Msg("status page write body")
		}
	})
}

func corsHandler() func(next http.Handler) http.Handler {
	// CORS options for trusted https://*.skyweaver.net apps, where we allow
	// authorization headers to pass.
	trustedOrigins := []string{
		"https://api.skyweaver.net",
		"https://*-api.skyweaver.net",
		"https://dev*.skyweaver.net",
		"https://stg.skyweaver.net",
		"https://beta.skyweaver.net",
		"https://play.skyweaver.net",
		"https://release.skyweaver.net",
		"https://pts.skyweaver.net",
	}
	corsTrustedOptions := cors.Options{
		AllowedOrigins:   trustedOrigins,
		AllowedMethods:   []string{"HEAD", "GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Release"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           600,
	}

	// For local dev mode, allow all traffic
	if VERSION == "dev" {
		corsTrustedOptions.AllowOriginFunc = func(r *http.Request, origin string) bool {
			return true
		}
		return cors.Handler(corsTrustedOptions)
	}

	// CORS options for third-party apps, where we block
	// authorization headers.
	corsThirdPartyOptions := cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"HEAD", "GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Release"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false, // IMPORTANT! must be false
		MaxAge:           600,
	}

	// Here we use the RouteHeaders middleware to split the request paths depending
	// on the Origin request header value.
	return middleware.RouteHeaders().
		RouteAny("Origin", trustedOrigins, cors.Handler(corsTrustedOptions)).
		Route("Origin", "*", cors.Handler(corsThirdPartyOptions)).
		Handler
}
