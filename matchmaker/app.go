package matchmaker

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"net"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httplog"
	"github.com/go-chi/httprate"
	httprateredis "github.com/go-chi/httprate-redis"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-chi/telemetry"
	"github.com/gorilla/websocket"
	"github.com/goware/cachestore/memlru"
	"github.com/goware/logadapter-zerolog"
	"github.com/goware/pubsub/membus"
	"github.com/goware/pubsub/redisbus"
	"github.com/honeybadger-io/honeybadger-go"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/ncruces/go-dns"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
	"github.com/horizon-games/OpenSky/matchmaker/config"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director"
	"github.com/horizon-games/OpenSky/matchmaker/lib/director/matchhandlers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/events"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/acceptmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/declinematch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch"
	"github.com/horizon-games/OpenSky/matchmaker/lib/frontend/findmatch/validators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gamemodechecker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/gameservers/customgameservers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/httpclient"
	"github.com/horizon-games/OpenSky/matchmaker/lib/lock"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/custommatchmaker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchquality/factorcalculators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias"
	"github.com/horizon-games/OpenSky/matchmaker/lib/matchtrackers"
	"github.com/horizon-games/OpenSky/matchmaker/lib/opensky"
	"github.com/horizon-games/OpenSky/matchmaker/lib/penaltytracker"
	"github.com/horizon-games/OpenSky/matchmaker/lib/player/bot"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerchannel"
	"github.com/horizon-games/OpenSky/matchmaker/lib/playerstats"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue/memqueue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/queue/redisqueue"
	"github.com/horizon-games/OpenSky/matchmaker/lib/store"
)

func init() {
	rand.Seed(time.Now().UnixNano())

	// internal DNS resolver with cache
	net.DefaultResolver = dns.NewCachingResolver(nil)
}

type App struct {
	config *config.Config
	log    zerolog.Logger
	http   *http.Server

	jwtAuth             *jwtauth.JWTAuth
	frontendHTTPHandler *frontend.HTTPHandler

	keyValStore store.Store
	pubsub      events.PubSub

	directorHandler     runner
	autoAccepter        runner
	acceptTimeouter     runner
	botFactory          runner
	clientEventListener runner
	websocketHandler    runner
}

func New(cfg *config.Config) (*App, error) {
	err := cfg.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	// Logging
	log := httplog.NewLogger(cfg.Service.Name, httplog.Options{
		LogLevel:       cfg.Logging.Level,
		LevelFieldName: "severity",
		JSON:           cfg.Logging.JSON,
		Concise:        cfg.Logging.Concise,
		Tags: map[string]string{
			"serviceVersion": cfg.VersionHash,
		},
	})

	logWrapper := logadapter.LogAdapter(log)

	// Honeybadger - error reporting service
	if cfg.Honeybadger.APIKey != "" {
		honeybadger.Configure(honeybadger.Configuration{
			APIKey: cfg.Honeybadger.APIKey,
			Env:    cfg.Mode.String(),
			Sync:   true, // send errors in the background, async
		})
		honeybadger.SetContext(honeybadger.Context{
			"RELEASE": cfg.VersionHash,
			"ENV":     cfg.Mode.String(),
		})
	}

	// HTTP Server
	httpServer := &http.Server{
		Addr:              cfg.Service.Listen,
		ReadTimeout:       5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       45 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}

	var redisClient *redis.Client

	var keyValStore store.Store

	var pubsub events.PubSub

	var queueDistributor queue.Distributor

	var locker lock.Locker

	if cfg.Redis.Disabled {
		keyValStore = store.NewMemStore()

		pubsub, err = membus.New[events.Event](logWrapper)
		if err != nil {
			return nil, fmt.Errorf("initialize memory pubsub: %w", err)
		}

		queueDistributor = memqueue.NewMemQueue(keyValStore)

		locker = lock.NewMemLock()
	} else {
		redisClient, err = store.NewRedisClient(cfg.Redis)
		if err != nil {
			return nil, fmt.Errorf("initialize Redis pool: %w", err)
		}

		keyValStore, err = store.NewRedisStore(redisClient)
		if err != nil {
			return nil, fmt.Errorf("initiate Redis store: %w", err)
		}

		pubsub, err = redisbus.New[events.Event](logWrapper, redisClient, events.MessageEncoder[events.Event]{})
		if err != nil {
			return nil, fmt.Errorf("initiate Redis pubsub: %w", err)
		}

		queueDistributor, err = redisqueue.NewRedisQueue(redisClient)
		if err != nil {
			return nil, fmt.Errorf("initiate Redis queue: %w", err)
		}

		locker = lock.NewRedisLock(redisClient)
	}

	openskyAPI := opensky.NewAPI(cfg, log, opensky.NewClient(cfg))

	customGameServerClient := customgameservers.NewClient(cfg.GameServer, httpclient.NewWithInsecure(cfg.GameServer.AllowInsecureTLS))

	customGameServerRepository := customgameservers.NewServerRepository(keyValStore)

	customGameServerManager := customgameservers.NewManager(log, customGameServerRepository, customGameServerClient)

	gameModeStatusCheckerCacheStore, err := memlru.New[[]byte]()
	if err != nil {
		return nil, fmt.Errorf("initiate game mode status checker cache store: %w", err)
	}

	gameModeStatusChecker := gamemodechecker.NewChecker(cfg, log, openskyAPI, gameModeStatusCheckerCacheStore)

	notifier := playerchannel.NewNotifier(pubsub)

	matchProposalAcceptedQueue := custommatchmaker.NewMatchProposalQueue(queueDistributor, matchmaker.MatchProposalStatusAccepted)

	matchProposalRepository := custommatchmaker.NewMatchProposalRepository(cfg, keyValStore, locker, matchProposalAcceptedQueue)

	playerRepository := custommatchmaker.NewPlayerRepository(cfg, keyValStore)

	penaltyTracker := penaltytracker.NewTracker(cfg, keyValStore)

	matchInProgressTracker := matchtrackers.NewMatchInProgressTracker(keyValStore, customGameServerRepository)

	recentMatchTracker := matchtrackers.NewRecentMatchTracker(keyValStore)

	playerQueue := custommatchmaker.NewPlayerQueue(queueDistributor)

	accepter := custommatchmaker.NewAccepter(matchProposalRepository, playerRepository, notifier)

	decliner := custommatchmaker.NewDecliner(
		log,
		playerRepository,
		playerQueue,
		matchProposalRepository,
		notifier,
		penaltyTracker,
	)

	playerStatsManager := playerstats.NewPlayerStatsManager(keyValStore)

	playerQueueChannelCloser := custommatchmaker.NewPlayerQueueChannelCloser(log, playerQueue)
	declineMatchChannelCloser := custommatchmaker.NewDeclineMatchChannelCloser(decliner)

	channelFactory := playerchannel.NewFactory(log, pubsub, playerQueueChannelCloser, declineMatchChannelCloser)

	matchmakerFrontendService := custommatchmaker.NewFrontendService(
		log,
		playerQueue,
		playerRepository,
		matchProposalRepository,
		channelFactory,
		notifier,
		accepter,
		decliner,
	)

	autoAccepter := playerchannel.NewAutoAccepter(cfg, matchmakerFrontendService)

	botFactory := bot.NewFactory(log, openskyAPI, channelFactory, autoAccepter)

	acceptTimeouter := custommatchmaker.NewAcceptTimeouter(
		log,
		matchProposalRepository,
		playerRepository,
		accepter,
		notifier,
		penaltyTracker,
	)

	challengeCriteria := gamemodecriterias.NewChallengeCriteria()

	pvpAndRankedWaitTimeScoreCalculator := gamemodecriterias.NewWaitTimeScoreCalculator(
		cfg,
		[]int{100, 200, 300, 400},
	)

	practicePVPCriteria := gamemodecriterias.NewPracticePVPCriteria(pvpAndRankedWaitTimeScoreCalculator)

	conquestCriteria := gamemodecriterias.NewConquestCriteria(
		cfg,
		gamemodecriterias.NewWaitTimeScoreCalculator(
			cfg,
			[]int{0, 1, 2},
		),
		// 0 - 30 seconds: Elo within 2 points
		// 30 - 60 seconds: Elo within 5 points
		// 60 - 90 seconds: Elo within 9 points
		// 90 - 120 seconds: Elo within 14 points
		// 120 - x seconds: Elo within 20 points
		gamemodecriterias.NewWaitTimeScoreCalculator(
			cfg,
			[]int{2, 5, 9, 14, math.MaxInt},
		),
	)

	rankedCriteria := gamemodecriterias.NewRankedCriteria(pvpAndRankedWaitTimeScoreCalculator)

	playerCombinator := matchers.NewPlayerCombinator(
		log,
		matchvalidators.NewBotMatchValidator(cfg),
		matchvalidators.NewVersionValidator(),
		matchvalidators.NewSessionValidator(),
		matchvalidators.NewSameIPAddressValidator(cfg, challengeCriteria),
		matchvalidators.NewGameModeCriteriaValidator(
			challengeCriteria,
			practicePVPCriteria,
			conquestCriteria,
			rankedCriteria,
		),
	)

	mmrDifferenceFactorCalculator := factorcalculators.NewMMRDifferenceCalculator()
	sameHeroFactorCalculator := factorcalculators.NewSameHeroCalculator()
	rematchFactorCalculator := factorcalculators.NewRematchCalculator(log, playerStatsManager)
	tradableCardsFactorCalculator := factorcalculators.NewTradableCalculator()

	matchQualityCalculator := matchquality.NewQualityCalculator(
		mmrDifferenceFactorCalculator,
		sameHeroFactorCalculator,
		rematchFactorCalculator,
		tradableCardsFactorCalculator,
	)

	matchQualitySorter := matchquality.NewQualitySorter(matchQualityCalculator)

	clientMessageSender := frontend.NewMessageSender()

	clientEventListener := findmatch.NewEventListener(clientMessageSender)

	findMatchHandler := findmatch.NewHandler(
		findmatch.NewPlayerFactory(log, openskyAPI),
		notifier,
		matchmakerFrontendService,
		clientEventListener,
		validators.NewVersionValidator(cfg),
		validators.NewIPAddressValidatorValidator(cfg),
		validators.NewAuthValidator(cfg),
		validators.NewCaptchaValidator(cfg, log, keyValStore, http.DefaultClient),
		validators.NewGameModeDataConsistencyValidator(),
		validators.NewGameModeExclusiveValidator(
			[]proto.GameMode{
				proto.GameMode_CONQUEST_CONSTRUCTED,
				proto.GameMode_CONQUEST_DISCOVERY,
			},
			validators.NewConquestValidator(cfg),
		),
		validators.NewDeckValidator(openskyAPI),
		validators.NewGameModeStatusValidator(gameModeStatusChecker),
		validators.NewMatchInProgressValidator(matchInProgressTracker, clientMessageSender),
		validators.NewPendingMatchValidator(matchProposalRepository),
		validators.NewPenaltyValidator(log, penaltyTracker, clientMessageSender),
	)

	websocketHandler := frontend.NewWebsocketHandler(
		cfg,
		log,
		frontend.NewClientFactory(log),
		frontend.NewMessageReceiver(),
		findMatchHandler,
		acceptmatch.NewHandler(matchmakerFrontendService),
		declinematch.NewHandler(matchmakerFrontendService),
		clientMessageSender,
	)

	websocketUpgrader := &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	gameModeLocker := custommatchmaker.NewGameModeLocker(locker)

	statusService := custommatchmaker.NewStatusService(
		cfg,
		log,
		customGameServerManager,
		playerQueue,
		playerRepository,
		gameModeLocker,
	)

	ipAddressRetriever := frontend.NewIPAddressRetriever(cfg)

	frontendHTTPHandler := frontend.NewHTTPHandler(
		log,
		ipAddressRetriever,
		websocketUpgrader,
		websocketHandler,
		statusService,
		redisClient,
		AccountFromContext,
		HandleHTTPError,
		matchInProgressTracker,
		recentMatchTracker,
	)

	matchmakerQueryService := custommatchmaker.NewQueryService(
		log,
		playerQueue,
		playerRepository,
		notifier,
	)

	matchingPlayerValidator := matchers.NewPlayerValidator(playerRepository, 0.4)

	matchmakerMatching := matching.NewHandler(
		matchers.NewMatcherCompetenceDecorator(
			matchers.NewBotMatchMatcher(log, matchmakerQueryService, botFactory),
			matchers.FindMatchesConditions{
				GameModes: []proto.GameMode{
					proto.GameMode_WARM_UP,
					proto.GameMode_PRACTICE_BOT,
				},
			},
		),
		matchers.NewMatcherCompetenceDecorator(
			matchers.NewPVPMatchMatcher(
				log,
				matchmakerQueryService,
				matchingPlayerValidator,
				botFactory,
				playerCombinator,
				matchQualitySorter,
			),
			matchers.FindMatchesConditions{
				GameModes: []proto.GameMode{
					proto.GameMode_PRACTICE_PVP,
					proto.GameMode_RANKED_CONSTRUCTED,
					proto.GameMode_RANKED_DISCOVERY,
					proto.GameMode_CONQUEST_CONSTRUCTED,
					proto.GameMode_CHALLENGE_CONSTRUCTED,
					proto.GameMode_CHALLENGE_DISCOVERY,
				},
			},
		),
	)

	matchmakerBackendService := custommatchmaker.NewBackendService(
		cfg,
		log,
		matchmakerMatching,
		notifier,
		playerQueue,
		gameModeLocker,
		gameModeStatusChecker,
		playerRepository,
		matchProposalRepository,
		matchProposalAcceptedQueue,
		acceptTimeouter,
	)

	playerShuffler := matchhandlers.NewPlayerShuffler()

	directorHandler := director.NewHandler(
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.Practice.Bot,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewBotMatchProcessor(
					matchmakerBackendService,
					customGameServerManager,
					openskyAPI,
					playerShuffler,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_PRACTICE_BOT,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
				},
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_WARM_UP,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.Practice.PVP,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPFindMatchProcessor(
					matchmakerBackendService,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_PRACTICE_PVP,
						proto.GameMode_RANKED_CONSTRUCTED,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
					EnableBots:          cfg.MatchMaker.PlayerBot.EnabledInRankedQueue,
				},
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_RANKED_DISCOVERY,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
					EnableBots:          cfg.MatchMaker.PlayerBot.EnabledInRankedQueue,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.Conquest.Constructed,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPFindMatchProcessor(
					matchmakerBackendService,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_CONQUEST_CONSTRUCTED,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.Challenge.Constructed,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPFindMatchProcessor(
					matchmakerBackendService,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_CHALLENGE_CONSTRUCTED,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.Challenge.Discovery,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPFindMatchProcessor(
					matchmakerBackendService,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_CHALLENGE_DISCOVERY,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusFound,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.MakeMatch,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPMakeMatchProcessor(
					log,
					matchmakerBackendService,
					customGameServerManager,
					openskyAPI,
					penaltyTracker,
					playerStatsManager,
					recentMatchTracker,
					playerShuffler,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_PRACTICE_PVP,
						proto.GameMode_RANKED_CONSTRUCTED,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusAccepted,
				},
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_RANKED_DISCOVERY,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusAccepted,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.MakeMatch,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPMakeMatchProcessor(
					log,
					matchmakerBackendService,
					customGameServerManager,
					openskyAPI,
					penaltyTracker,
					playerStatsManager,
					recentMatchTracker,
					playerShuffler,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_CONQUEST_CONSTRUCTED,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusAccepted,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.MakeMatch,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPMakeMatchProcessor(
					log,
					matchmakerBackendService,
					customGameServerManager,
					openskyAPI,
					penaltyTracker,
					playerStatsManager,
					recentMatchTracker,
					playerShuffler,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_CHALLENGE_CONSTRUCTED,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusAccepted,
				},
			),
		),
		director.NewRunner(
			log,
			cfg.MatchMaker.MatchInterval.MakeMatch,
			matchhandlers.NewMatchHandler(
				log,
				matchmakerBackendService,
				matchhandlers.NewPVPMakeMatchProcessor(
					log,
					matchmakerBackendService,
					customGameServerManager,
					openskyAPI,
					penaltyTracker,
					playerStatsManager,
					recentMatchTracker,
					playerShuffler,
				),
				matchhandlers.FindMatchesParams{
					GameModes: []proto.GameMode{
						proto.GameMode_CHALLENGE_DISCOVERY,
					},
					MatchProposalStatus: matchmaker.MatchProposalStatusAccepted,
				},
			),
		),
	)

	jwtAuth := jwtauth.New("HS256", []byte(cfg.Auth.JWTSecret), nil, jwt.WithAcceptableSkew(5*time.Minute))

	service := &App{
		config:              cfg,
		http:                httpServer,
		log:                 log,
		jwtAuth:             jwtAuth,
		frontendHTTPHandler: frontendHTTPHandler,
		keyValStore:         keyValStore,
		pubsub:              pubsub,
		directorHandler:     directorHandler,
		autoAccepter:        autoAccepter,
		acceptTimeouter:     acceptTimeouter,
		botFactory:          botFactory,
		clientEventListener: clientEventListener,
		websocketHandler:    websocketHandler,
	}

	return service, nil
}

func (a *App) Start(ctx context.Context) error {
	errCh := make(chan error, 1)

	go func() {
		defer honeybadger.Monitor()

		err := a.pubsub.Run(ctx)
		if err != nil {
			errCh <- fmt.Errorf("pubsub: %w", err)
		}
	}()
	defer a.pubsub.Stop()

	a.log.Info().Msgf("OpenSky MatchMaker - listening on %s", a.http.Addr)

	a.http.Handler = a.httpHandler()

	go func() {
		if err := a.autoAccepter.Run(ctx); err != nil {
			errCh <- fmt.Errorf("run auto-accepter: %w", err)
		}
	}()

	go func() {
		if err := a.acceptTimeouter.Run(ctx); err != nil {
			errCh <- fmt.Errorf("run accept timeouter: %w", err)
		}
	}()

	go func() {
		if err := a.botFactory.Run(ctx); err != nil {
			errCh <- fmt.Errorf("run bot factory: %w", err)
		}
	}()

	go func() {
		if err := a.clientEventListener.Run(ctx); err != nil {
			errCh <- fmt.Errorf("run bot factory: %w", err)
		}
	}()

	go func() {
		if err := a.directorHandler.Run(ctx); err != nil {
			errCh <- fmt.Errorf("run director hanler: %w", err)
		}
	}()

	go func() {
		if err := a.websocketHandler.Run(ctx); err != nil {
			errCh <- fmt.Errorf("run bot factory: %w", err)
		}
	}()

	go func() {
		if err := a.http.ListenAndServe(); err != nil {
			errCh <- fmt.Errorf("HTTP server: %w", err)
		}
	}()

	select {
	case err := <-errCh:
		a.log.Err(err).Msg("unrecoverable service failure")
		return err
	case <-ctx.Done():
		a.log.Info().Msg("OpenSky MatchMaker - stopped")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := a.http.Shutdown(ctx); err != nil {
			a.log.Err(err).Msg("shutdown http server")
		}

		return nil
	}
}

func (a *App) httpHandler() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(telemetry.Collector(a.config.Telemetry, []string{"/status"}))
	r.Use(honeybadger.Handler)

	r.Use(httplog.RequestLogger(
		a.log.With().
			Str("module", "http").
			Logger(),
	))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Release"},
		AllowCredentials: true,
		MaxAge:           600,
	}))

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if _, err := w.Write([]byte(".")); err != nil {
			a.log.Err(err).Msg("write to body")
		}
	})

	r.Group(func(r chi.Router) {
		r.Use(jwtauth.Verifier(a.jwtAuth))
		r.Use(jwtauth.Authenticator(a.jwtAuth))

		// Put the player account address on the request context
		r.Use(AccountHandler(a.jwtAuth))

		// Rate limit based on the account address
		httpRateOptions := []httprate.Option{
			httprate.WithKeyFuncs(func(r *http.Request) (string, error) {
				account, err := AccountFromContext(r.Context())
				if err != nil {
					return "", fmt.Errorf("get account from context: %w", err)
				}

				return account, nil
			}),
		}

		// use redis backend for rate limiter if redis is configured
		if !a.config.Redis.Disabled && a.config.Redis.Host != "" {
			httpRateOptions = append(httpRateOptions, httprateredis.WithRedisLimitCounter(&httprateredis.Config{
				Host:      a.config.Redis.Host,
				Port:      a.config.Redis.Port,
				DBIndex:   a.config.Redis.DBIndex,
				MaxIdle:   a.config.Redis.MaxIdle,
				MaxActive: a.config.Redis.MaxActive,
			}))
		}

		r.Use(httprate.Limit(
			50,            // # of requests
			1*time.Minute, // per window of time
			httpRateOptions...,
		))

		r.HandleFunc("/matchinfo/{playerID}", a.frontendHTTPHandler.MatchInfoHandle)
	})

	r.HandleFunc("/status", a.frontendHTTPHandler.StatusHandle)

	r.HandleFunc("/", a.frontendHTTPHandler.MatchMakerHandle)

	return r
}

func (a *App) HTTPAddr() string {
	return a.http.Addr
}

func (a *App) KeyValStore() store.Store {
	return a.keyValStore
}

type runner interface {
	Run(context.Context) error
}
