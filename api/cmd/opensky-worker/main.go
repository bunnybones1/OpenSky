package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/0xsequence/ethkit/ethrpc"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/telemetry"
	"github.com/goware/cachestore"
	"github.com/goware/cachestore/memlru"
	"github.com/goware/cachestore/redis"
	"github.com/goware/logadapter-zerolog"
	"github.com/rs/zerolog/log"

	"github.com/horizon-games/OpenSky/api"
	"github.com/horizon-games/OpenSky/api/config"
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/lib/analytics"
	"github.com/horizon-games/OpenSky/api/lib/conquest"
	"github.com/horizon-games/OpenSky/api/lib/conquest/conquestv2"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/contracts/abis"
	"github.com/horizon-games/OpenSky/api/lib/decks"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/metrics"
	"github.com/horizon-games/OpenSky/api/lib/notification/pushnotification"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/lib/payments/stripe"
	"github.com/horizon-games/OpenSky/api/lib/rankup/grandmasters"
	"github.com/horizon-games/OpenSky/api/lib/skypass"
)

var (
	flags      = flag.NewFlagSet("opensky-api", flag.ExitOnError)
	configFile = flags.String("config", "", "path to config file")
	version    = flags.Bool("version", false, "print version and exit")
)

func main() {
	if err := flags.Parse(os.Args[1:]); err != nil {
		log.Fatal().Err(fmt.Errorf("parse flags: %w", err))
	}

	if *version {
		fmt.Println(api.VERSION)
		os.Exit(1)
	}

	// NOTE: opensky-worker command should also use the opensky-api.conf
	// for configuration.

	cfg := &config.Config{}
	err := config.NewFromFile(*configFile, os.Getenv("CONFIG"), cfg)
	if err != nil {
		log.Fatal().Err(err)
	}
	config.Instance = cfg

	// First season start
	if cfg.OpenSky.FirstSeasonStartOverride != "" {
		firstSeasonStart, err := time.Parse(time.RFC3339, cfg.OpenSky.FirstSeasonStartOverride)
		if err != nil {
			log.Fatal().Msgf("config error: first_season_start_override not empty, but in invalid format. RFC3339 format required: %v", err)
		}
		data.OverrideFirstSeasonStart(firstSeasonStart)
	}

	if _, err := data.NewDBSession(cfg.DB); err != nil {
		log.Fatal().Err(err)
	}
	err = data.DB.Ping()
	if err != nil {
		log.Fatal().Err(err)
	}

	metricsCollector := metrics.NewPrometheusCollector()

	provider, err := ethrpc.NewProvider(cfg.Ethereum.URL)
	if err != nil {
		log.Fatal().Err(err).Msgf("initiate provider")
	}

	worker := jobqueue.NewWorker(metricsCollector)

	balanceSyncRunner, err := jobqueue.NewBalanceSyncRunner(metricsCollector)
	if err != nil {
		log.Error().Msgf("balanceSyncRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(balanceSyncRunner)
		if err != nil {
			log.Err(err).Msg("register BalanceSyncRunner")
		} else {
			log.Info().Msg("registered BalanceSyncRunner")
		}
	}

	if cfg.OpenSky.Worker.RewardsMinting {
		leaderboardRewardsRunner := jobqueue.NewLeaderboardRewardsRunner(cfg.OpenSky.LeaderboardRewards)
		err = worker.RegisterTaskRunner(leaderboardRewardsRunner)
		if err != nil {
			log.Err(err).Msg("register LeaderboardRewardsRunner")
		} else {
			log.Info().Msg("registered LeaderboardRewardsRunner")
		}
	}

	txnStatusRunner, err := jobqueue.NewTxnStatusRunner(metricsCollector)
	if err != nil {
		log.Error().Msgf("txnStatusRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(txnStatusRunner)
		if err != nil {
			log.Err(err).Msg("register TxnStatusRunner")
		} else {
			log.Info().Msg("registered TxnStatusRunner")
		}
	}

	contractUSDC, err := contracts.NewERC20(
		abis.USDCRewardFactory,
		cfg.Contracts.USDCContract,
		provider,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("instantiate usdc contract")
	}

	contractOpenSkyAssets, err := contracts.NewERC1155(
		abis.OpenSkyAssets,
		cfg.Contracts.SkyweaverAssetsContract,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("instantiate opensky assets contract")
	}

	contractPaymentProxy, err := contracts.NewPaymentProxy(
		abis.PaymentProxyFactory,
		cfg.Contracts.PaymentContract,
		provider,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("instantiate payment proxy contract")
	}

	sendTxnsRunner, err := jobqueue.NewSendTxnsRunner(
		conquest.NewStateManager(cfg.OpenSky.ConquestV2Config, metricsCollector),
		contractUSDC,
		contractOpenSkyAssets,
	)
	if err != nil {
		log.Error().Msgf("sendTxnsRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(sendTxnsRunner)
		if err != nil {
			log.Err(err).Msg("register SendTxnsRunner")
		} else {
			log.Info().Msg("registered SendTxnsRunner")
		}
	}
	/*
		if !cfg.OpenSky.Worker.DisableBotDetection {
			ipSignalsRunner, err := jobqueue.NewIPSignalsRunner()
			if err != nil {
				log.Error().Msgf("ipSignalsRunner creation failed with %v", err)
			} else {
				err = worker.RegisterTaskRunner(ipSignalsRunner)
				if err != nil {
					log.Err(err).Msg("register IPSignalsRunner")
				} else {
					log.Info().Msg("registered IPSignalsRunner")
				}
			}

			uaSignalsRunner, err := jobqueue.NewUASignalsRunner()
			if err != nil {
				log.Error().Msgf("uaSignalsRunner creation failed with %v", err)
			} else {
				err = worker.RegisterTaskRunner(uaSignalsRunner)
				if err != nil {
					log.Err(err).Msg("register UASignalsRunner")
				} else {
					log.Info().Msg("registered UASignalsRunner")
				}
			}

			usernameSignalsRunner, err := jobqueue.NewUsernameSignalsRunner()
			if err != nil {
				log.Error().Msgf("usernameSignalsRunner creation failed with %v", err)
			} else {
				err = worker.RegisterTaskRunner(usernameSignalsRunner)
				if err != nil {
					log.Err(err).Msg("register UsernameSignalsRunner")
				} else {
					log.Info().Msg("registered UsernameSignalsRunner")
				}
			}

			matchSignalsRunner, err := jobqueue.NewMatchSignalsRunner()
			if err != nil {
				log.Error().Msgf("matchSignalsRunner creation failed with %v", err)
			} else {
				err = worker.RegisterTaskRunner(matchSignalsRunner)
				if err != nil {
					log.Err(err).Msg("register MatchSignalsRunner")
				} else {
					log.Info().Msg("registered MatchSignalsRunner")
				}
			}

			autoBotActionsRunner, err := jobqueue.NewAutoBotActionsRunner()
			if err != nil {
				log.Error().Msgf("autoBotActionsRunner creation failed with %v", err)
			} else {
				err = worker.RegisterTaskRunner(autoBotActionsRunner)
				if err != nil {
					log.Err(err).Msg("register AutoBotActionsRunner")
				} else {
					log.Info().Msg("registered autoBotActionsRunner")
				}
			}

			accountScoreRunner, err := jobqueue.NewAccountScoreRunner()
			if err != nil {
				log.Error().Msgf("accountScoreRunner creation failed with %v", err)
			} else {
				err = worker.RegisterTaskRunner(accountScoreRunner)
				if err != nil {
					log.Err(err).Msg("register AccountScoreRunner")
				} else {
					log.Info().Msg("registered AccountScoreRunner")
				}
			}
		}
	*/
	lazyMigrationRunner := jobqueue.NewLazyMigrationRunner()
	err = worker.RegisterTaskRunner(lazyMigrationRunner)
	if err != nil {
		log.Err(err).Msg("register LazyMigrationRunner")
	} else {
		log.Info().Msg("registered LazyMigrationRunner")
	}

	/*()
	fixRanksRunner, err := jobqueue.NewFixPlayerRanksRunner()
	if err != nil {
		log.Error().Msgf("fixPlayerRanksRunner creation failed with %v", err)
	} else {
		worker.RegisterTaskRunner(fixRanksRunner)
		log.Info().Msg("registered fixPlayerRanksRunner")
	}
	*/

	crashedMatchCleanupRunner, err := jobqueue.NewCrashedMatchCleanupRunner()
	if err != nil {
		log.Error().Msgf("crashedMatchCleanupRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(crashedMatchCleanupRunner)
		if err != nil {
			log.Err(err).Msg("register CrashedMatchCleanupRunner")
		} else {
			log.Info().Msg("registered CrashedMatchCleanupRunner")
		}
	}
	/*
		stickerRewardsRunner := jobqueue.NewStickerRewardsRunner(cfg.OpenSky.StickerRewards)
		err = worker.RegisterTaskRunner(stickerRewardsRunner)
		if err != nil {
			log.Err(err).Msg("register StickerRewardsRunner")
		} else {
			log.Info().Msg("registered StickerRewardsRunner")
		}
	*/
	if cfg.OpenSky.Worker.RewardsMinting {
		grantStickerRewardsRunner := jobqueue.NewGrantStickerRewardsRunner(cfg.OpenSky.StickerRewards)
		err = worker.RegisterTaskRunner(grantStickerRewardsRunner)
		if err != nil {
			log.Err(err).Msg("register GrantStickerRewardsRunner")
		} else {
			log.Info().Msg("registered GrantStickerRewardsRunner")
		}
	}

	accountDeletionRunner, err := jobqueue.NewAccountDeletionRunner()
	if err != nil {
		log.Error().Msgf("AccountDeletionRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(accountDeletionRunner)
		if err != nil {
			log.Err(err).Msg("register AccountDeletionRunner")
		} else {
			log.Info().Msg("registered AccountDeletionRunner")
		}
	}

	markNotNewRunner, err := jobqueue.NewMarkNotNewRunner()
	if err != nil {
		log.Error().Msgf("MarkNotNewRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(markNotNewRunner)
		if err != nil {
			log.Err(err).Msg("register MarkNotNewRunner")
		} else {
			log.Info().Msg("registered MarkNotNewRunner")
		}
	}

	var cacheStore cachestore.Store[[]byte]
	if cfg.Redis.Enabled {
		cacheStore, err = redis.New[[]byte](&cfg.Redis)
		if err != nil {
			log.Error().Msgf("initiate Redis cache %v", err)
		}
	} else {
		cacheStore, err = memlru.New[[]byte]()
		if err != nil {
			log.Error().Msgf("initiate memory cache %v", err)
		}
	}

	conquestV2PoolManager := conquestv2.NewPoolManager(
		cfg.OpenSky.ConquestV2Config,
		log.Logger,
		cacheStore,
		conquestv2.NewTreasureLevelSummaryGetter(),
		metricsCollector,
	)

	conquestV2PoolRunner, err := jobqueue.NewConquestV2PoolRunner(conquestV2PoolManager)
	if err != nil {
		log.Error().Msgf("ConquestV2PoolRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(conquestV2PoolRunner)
		if err != nil {
			log.Err(err).Msg("register ConquestV2PoolRunner")
		} else {
			log.Info().Msg("registered ConquestV2PoolRunner")
		}
	}

	// Set up Analytics tracker
	analyticsTracker, err := analytics.NewAnalytics(
		cfg.Analytics,
		log.Logger,
		analytics.PolicyChecker(data.DB.CookiePolicies()),
	)
	if err != nil {
		log.Err(err).Msgf("failed to initialize analytics tracker")
	}

	conquestV2RewardsRunner, err := jobqueue.NewConquestV2RewardsRunner(
		cfg.OpenSky.ConquestV2Config,
		conquestV2PoolManager,
		conquestv2.NewTreasureCalculator(conquestV2PoolManager),
		analyticsTracker,
	)
	if err != nil {
		log.Error().Msgf("ConquestV2RewardsRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(conquestV2RewardsRunner)
		if err != nil {
			log.Err(err).Msg("register ConquestV2RewardsRunner")
		} else {
			log.Info().Msg("registered ConquestV2RewardsRunner")
		}
	}

	newRankPointsHardResetRunner, err := jobqueue.NewRankPointsHardResetRunner()
	if err != nil {
		log.Error().Msgf("NewRankPointsHardResetRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(newRankPointsHardResetRunner)
		if err != nil {
			log.Err(err).Msg("register RankPointsHardResetRunner")
		} else {
			log.Info().Msg("registered RankPointsHardResetRunner")
		}
	}

	newRankPointsSoftResetRunner, err := jobqueue.NewRankPointsSoftResetRunner()
	if err != nil {
		log.Error().Msgf("NewRankPointsSoftResetRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(newRankPointsSoftResetRunner)
		if err != nil {
			log.Err(err).Msg("register RankPointsSoftResetRunner")
		} else {
			log.Info().Msg("registered RankPointsSoftResetRunner")
		}
	}

	var pushNotifier jobqueue.PushNotifier

	if cfg.PushNotifications.OneSignalEnabled {
		pushNotifier = pushnotification.NewClient(cfg.PushNotifications)
	} else {
		pushNotifier = pushnotification.NewNullClient()
	}

	pushNotificationsRunner, err := jobqueue.NewPushNotificationsRunner(pushNotifier)
	if err != nil {
		log.Error().Msgf("PushNotificationsRunner creation failed with %v", err)
	} else {
		err = worker.RegisterTaskRunner(pushNotificationsRunner)
		if err != nil {
			log.Err(err).Msg("register PushNotificationsRunner")
		} else {
			log.Info().Msg("registered PushNotificationsRunner")
		}
	}

	skypassEndOfSeasonRunner := jobqueue.NewSkypassEndOfSeasonRunner()
	err = worker.RegisterTaskRunner(skypassEndOfSeasonRunner)
	if err != nil {
		log.Err(err).Msg("register SkypassEndOfSeasonRunner")
	} else {
		log.Info().Msg("registered SkypassEndOfSeasonRunner")
	}

	skypassRewardLister := skypass.NewLister(skypass.NewSamsungListerRuleApplier())
	skypassRewardApplier := skypass.NewRewardApplier(data.CardIndex, metricsCollector)
	skypassRewardClaimer := skypass.NewClaimer(skypassRewardLister, skypassRewardApplier)

	skypassAutoclaimRunner := jobqueue.NewSkypassAutoClaimRunner(skypassRewardLister, skypassRewardClaimer)
	err = worker.RegisterTaskRunner(skypassAutoclaimRunner)
	if err != nil {
		log.Err(err).Msg("register SkypassAutoClaimRunner")
	} else {
		log.Info().Msg("registered SkypassAutoClaimRunner")
	}

	paymentEventHandler := payments.NewEventHandler(
		stripe.NewClient(cfg.OpenSky.Stripe, http.DefaultClient),
		payments.NewProviderProductConverter(),
		payments.NewItemTokenGetterImpl(),
		payments.NewItemGainer(),
		analyticsTracker,
		metricsCollector,
	)

	stripeEventRunner := jobqueue.NewStripeEventRunner(paymentEventHandler)
	err = worker.RegisterTaskRunner(stripeEventRunner)
	if err != nil {
		log.Err(err).Msg("register StripeEventRunner")
	} else {
		log.Info().Msg("registered StripeEventRunner")
	}

	fixStarterDeckRunner := jobqueue.NewFixStarterDecksRunner()
	err = worker.RegisterTaskRunner(fixStarterDeckRunner)
	if err != nil {
		log.Err(err).Msg("register FixStarterDecksRunner")
	} else {
		log.Info().Msg("registered FixStarterDecksRunner")
	}

	giveawayOffChainTokensRunner := jobqueue.NewGiveawayOffChainTokensRunner()
	err = worker.RegisterTaskRunner(giveawayOffChainTokensRunner)
	if err != nil {
		log.Err(err).Msg("register GiveawayOffChainTokensRunner")
	} else {
		log.Info().Msg("registered GiveawayOffChainTokensRunner")
	}

	onChainPaymentEventRunner := jobqueue.NewOnChainPaymentEventRunner(paymentEventHandler)
	err = worker.RegisterTaskRunner(onChainPaymentEventRunner)
	if err != nil {
		log.Err(err).Msg("register OnChainPaymentEventRunner")
	} else {
		log.Info().Msg("registered OnChainPaymentEventRunner")
	}

	promoteGrandmastersRunner := jobqueue.NewPromoteGrandmastersRunner(grandmasters.NewUpdater())
	err = worker.RegisterTaskRunner(promoteGrandmastersRunner)
	if err != nil {
		log.Err(err).Msg("register PromoteGrandmastersRunner")
	} else {
		log.Info().Msg("registered PromoteGrandmastersRunner")
	}

	deckRankUpdateRunner := jobqueue.NewDeckRankUpdateRunner(decks.NewSyncRankUpdater())
	err = worker.RegisterTaskRunner(deckRankUpdateRunner)
	if err != nil {
		log.Err(err).Msg("register DeckRankUpdateRunner")
	} else {
		log.Info().Msg("registered DeckRankUpdateRunner")
	}

	ctx, cancelFunc := context.WithCancel(context.Background())

	if cfg.OpenSky.OnChainPayment.Enabled {
		onChainPaymentListenerRunner := jobqueue.NewOnChainPaymentListenerRunner(
			ctx,
			cfg.OpenSky.OnChainPayment,
			logadapter.LogAdapter(log.Logger),
			provider,
			contractUSDC,
			contractOpenSkyAssets,
			contractPaymentProxy,
			metricsCollector,
		)

		err = worker.RegisterTaskRunner(onChainPaymentListenerRunner)
		if err != nil {
			log.Err(err).Msg("register OnChainPaymentListenerRunner")
		} else {
			log.Info().Msg("registered OnChainPaymentListenerRunner")
		}
	}

	// HTTP services (metrics, etc.)
	go func() {
		log.Info().Msgf("startHTTPService: %v", webService(cfg))
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		for range sig {
			cancelFunc()
		}
	}()

	worker.Start(ctx)
}

func webService(cfg *config.Config) error {
	r := chi.NewRouter()
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(middleware.Heartbeat("/"))
	r.Use(telemetry.Collector(cfg.Telemetry))
	r.Handle("/*", http.NotFoundHandler())

	httpServer := &http.Server{
		Addr:    cfg.OpenSky.Worker.Listen,
		Handler: r,
	}
	return httpServer.ListenAndServe()
}
