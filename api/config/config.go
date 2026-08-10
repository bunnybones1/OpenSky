package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/0xsequence/go-sequence/lib/prototyp"
	"github.com/BurntSushi/toml"
	"github.com/go-chi/telemetry"
	"github.com/goware/cachestore/redis"
	"github.com/rs/zerolog"

	"github.com/horizon-games/OpenSky/api/proto"
)

var Instance *Config

type Config struct {
	GitCommit string `toml:"-"`
	Mode      Mode   `toml:"-"`

	Service ServiceConfig `toml:"service"`
	SSL     SSLConfig     `toml:"ssl"`

	Logging      LoggingConfig `toml:"logging"`
	Auth         Auth          `toml:"auth"`
	DB           DBConfig      `toml:"db"`
	DBMigrations DBMigrations  `toml:"db-migrations"`
	Redis        redis.Config  `toml:"redis"`

	Ethereum  EthereumConfig  `toml:"ethereum"`
	Sequence  SequenceConfig  `toml:"sequence"`
	Contracts ContractsConfig `toml:"contracts"`
	Wallet    WalletConfig    `toml:"wallet"`
	OpenSky   OpenSkyConfig   `toml:"opensky"`

	Analytics Analytics `toml:"analytics"`

	DelayedMinting DelayedMintingConfig `toml:"delayed-minting"`
	Honeybadger    Honeybadger          `toml:"honeybadger"`
	// Mailchimp      Mailchimp            `toml:"mailchimp"`
	// TODO: Remove if we dont plan to enable captcha
	Hcaptcha          Hcaptcha                `toml:"hcaptcha"`
	S3                S3Config                `toml:"s3"`
	GCPStorage        GCPStorageConfig        `toml:"gcp_storage"`
	Telemetry         telemetry.Config        `toml:"telemetry"`
	Profiling         ProfilingConfig         `toml:"profiling"`
	Twitch            TwitchConfig            `toml:"twitch"`
	Discord           DiscordConfig           `toml:"discord"`
	PushNotifications PushNotificationsConfig `toml:"push-notifications"`

	Account AccountConfig `toml:"account"`
	Match   MatchConfig   `toml:"match"`
}

type ServiceConfig struct {
	// Name that identifies the application
	Name string `toml:"name"`

	// Listen network url for the HTTP/RPC server
	Listen string `toml:"listen"`

	// Mode is the operating mode of the application, one of:
	// "development", "dev", "production" or "prod"
	Mode string `toml:"mode"`

	// CookieDomain
	CookieDomain string `toml:"cookie_domain"`
}

type SSLConfig struct {
	Cert string `toml:"cert_path"`
	Key  string `toml:"key_path"`
}

type LoggingConfig struct {
	Level   string `toml:"level"`
	JSON    bool   `toml:"json"`
	Concise bool   `toml:"concise"`
}

type Auth struct {
	JWTSecret           string     `toml:"jwt_secret"`
	UserLogoutCutoffStr string     `toml:"user_logout_cutoff"` // Format: RFC3339 ("2006-01-02T15:04:05")
	UserLogoutCutoff    *time.Time `toml:"-"`
}

type DBConfig struct {
	Database          string   `toml:"database"`
	Hosts             []string `toml:"hosts"`
	Username          string   `toml:"username"`
	Password          string   `toml:"password"`
	AppName           string   `toml:"app_name"`
	MaxOpenConns      int      `toml:"max_open_conns"`
	MaxIdleConns      int      `toml:"max_idle_conns"`
	ConnMaxLifetime   string   `toml:"conn_max_lifetime"`
	ConnMaxIdleTime   string   `toml:"conn_max_idletime"`
	ReportQueryErrors bool     `toml:"report_query_errors"`
	DebugQueries      bool     `toml:"debug_queries"`
}

type DBMigrations struct {
	Driver string `toml:"driver"`
	Dir    string `toml:"dir"`
}

type EthereumConfig struct {
	URL          string `toml:"url"`
	AuthChainURL string `toml:"auth_chain_url"`
}

type SequenceConfig struct {
	APIURL     string `toml:"api_url"`
	RelayerURL string `toml:"relayer_url"`
	IndexerURL string `toml:"indexer_url"`

	AccessKey string `toml:"access_key"`
}

type ContractsConfig struct {
	SkyweaverAssetsContract               string `toml:"skyweaver_assets_contract"`
	USDCContract                          string `toml:"usdc_contract"`
	LeaderboardSilverRewardsContract      string `toml:"leaderboard_silver_rewards_contract"`
	LeaderboardTicketRewardsContract      string `toml:"leaderboard_ticket_rewards_contract"`
	StickerRewardsContract                string `toml:"sticker_rewards_contract"`
	FreeConquestEntriesFactory            string `toml:"free_conquest_entries_factory"`
	ConquestTreasureSilverRewardsContract string `toml:"conquest_treasure_silver_rewards_contract"`
	CardBackRewardsContract               string `toml:"card_back_rewards_contract"`
	ConquestTokenId                       uint64 `toml:"conquest_token_id"`
	PaymentContract                       string `toml:"payment_contract"`
	SkypassSilverCardsFactory             string `toml:"skypass_silver_cards_factory_contract"`
	SkypassStickersFactory                string `toml:"skypass_sticker_factory_contract"`
	SkypassConquestTicketsFactory         string `toml:"skypass_conquest_tickets_factory_contract"`
	SilverRewardFactory                   string `toml:"silver_reward_factory_contract"`
	GoldRewardFactory                     string `toml:"gold_reward_factory_contract"`
}

// WalletConfig is the configuration for an Ethereum wallet
type WalletConfig struct {
	PrivateMnemonic string `toml:"private_mnemonic"`
	DerivationPath  string `toml:"derivation_path"`
	AccountIndex    uint32 `toml:"account_index"`
}

type OpenSkyConfig struct {
	ImageBaseURL string `toml:"image_base_url"`

	ExpMultiplier            float64 `toml:"experience_multiplier"`
	RewardMultiplier         int     `toml:"reward_multiplier"`
	FirstSeasonStartOverride string  `toml:"first_season_start_override"` // Format: RFC3339 ("2006-01-02T15:04:05")

	Worker struct {
		Listen              string `toml:"listen"`
		ItemBalanceSync     bool   `toml:"item_balance_sync"`
		RewardsMinting      bool   `toml:"rewards_minting"`
		DisableBotDetection bool   `toml:"disable_bot_detection"`
	} `toml:"worker"`

	LeaderboardRewards OpenSkyLeaderboardRewardsConfig `toml:"leaderboard_rewards"`

	StickerRewards OpenSkyStickerRewardsConfig `toml:"sticker_rewards"`

	GameMaster struct {
		AllowRankEloChange bool `toml:"allow_change_rank_elo"`
		AllAccountsAdmin   bool `toml:"all_accounts_admin"`
	} `toml:"gamemaster"`

	MobileIAP      OpenSkyMobileIAPConfig      `toml:"mobile-iap"`
	Stripe         OpenSkyStripeConfig         `toml:"stripe"`
	OnChainPayment OpenSkyOnChainPaymentConfig `toml:"onchain_payment"`

	ConquestV2Config OpenSkyConquestV2Config `toml:"conquest_v2"`

	SkypassConfig OpenSkySkypassConfig `toml:"skypass"`
}

type OpenSkyLeaderboardRewardsConfig struct {
	StrTime                       string           `toml:"time"`    // UTC time in HH:MM fomrat
	Weekday                       int              `toml:"weekday"` // Sunday = 0
	Time                          time.Time        `toml:"-"`
	RewardsExcludedCardSetsString string           `toml:"rewards_excluded_card_sets"` // Multiple card sets separated by comma.
	RewardsExcludedCardSets       []*proto.CardSet `toml:"-"`
}

type OpenSkyStickerRewardsConfig struct {
	CheckForPendingRewardsMinutes uint `toml:"check_for_pending_rewards_minutes"`
	MintingDelayMinutes           uint `toml:"minting_delay_minutes"`
}

type OpenSkyConquestV2Config struct {
	MaxPoolCeiling                       int32            `toml:"max_pool_ceiling"`
	PoolCeiling                          int32            `toml:"pool_ceiling"`
	PoolFloor                            int32            `toml:"pool_floor"`
	TopWeightUnitPrice                   float32          `toml:"top_weight_unit_price"`
	BottomWeightUnitPrice                float32          `toml:"bottom_weight_unit_price"`
	WeightPerSilverCard                  float32          `toml:"weight_per_silver_card"`
	PoolTTLSeconds                       int32            `toml:"pool_ttl_seconds"`
	PoolTTL                              time.Duration    `toml:"-"`
	RewardsScheduleWeekday               int              `toml:"rewards_schedule_weekday"` // Sunday = 0
	RewardsScheduleStrTime               string           `toml:"rewards_schedule_time"`    // UTC time in HH:MM format
	RewardsScheduleTime                  time.Time        `toml:"-"`
	RewardsSendWeekday                   int              `toml:"rewards_send_weekday"` // Sunday = 0
	RewardsSendStrTime                   string           `toml:"rewards_send_time"`    // UTC time in HH:MM format
	RewardsSendTime                      time.Time        `toml:"-"`
	RewardsExcludedCardSetsString        string           `toml:"rewards_excluded_card_sets"` // Multiple card sets separated by comma.
	RewardsExcludedCardSets              []*proto.CardSet `toml:"-"`
	RewardsWeeklyExclusiveCardSetsString string           `toml:"rewards_weekly_exclusive_card_sets"` // Multiple card sets separated by comma.
	RewardsWeeklyExclusiveCardSets       []*proto.CardSet `toml:"-"`
}

type OpenSkySkypassConfig struct {
	Enabled                                   bool   `toml:"enabled"`
	DisabledOnlyFutureRewardsUpdateProtection bool   `toml:"disabled_only_future_rewards_update_protection"`
	GiveawayLimit                             uint64 `toml:"giveaway_limit"`
}

type OpenSkyMobileIAPConfig struct {
	Enabled       bool   `toml:"enabled"`
	GoogleKeyData string `toml:"google_key_data"`
	// One retry every second.
	GoogleRetryPeriodSeconds int `toml:"google_retry_period_seconds"`
	GoogleRetryPeriod        time.Duration
}

type OpenSkyStripeConfig struct {
	Enabled    bool   `toml:"enabled"`
	APIKey     string `toml:"api_key"`
	SuccessURL string `toml:"success_url"`
	CancelURL  string `toml:"cancel_url"`
}

type OpenSkyOnChainPaymentConfig struct {
	Enabled                           bool `toml:"enabled"`
	MonitorDebugLogging               bool `toml:"monitor_debug_logging"`
	MonitorPollingIntervalMillisecond int  `toml:"monitor_polling_interval_millisecond"`
	MonitorPollingInterval            time.Duration
	MonitorStartNumBlocksBack         uint64 `toml:"monitor_start_num_blocks_back"`
	SubscribeIdleTimeout              time.Duration
	SubscribeIdleTimeoutSeconds       int `toml:"subscribe_idle_timeout_seconds"`
}

type Analytics struct {
	Enabled bool `toml:"enabled"`
	// Databeat Databeat `toml:"databeat"`
}

// type Databeat struct {
// 	Enabled        bool   `toml:"enabled"`
// 	DatabeatServer string `toml:"databeat_server"`
// 	AuthToken      string `toml:"auth_token"`
// 	Source         string `toml:"source"`
// }

type DelayedMintingConfig struct {
	MintingDelayMinutes uint `toml:"minting_delay_minutes"`
}

type Honeybadger struct {
	APIKey string `toml:"api_key"`
}

type Mailchimp struct {
	APIKey          string `toml:"api_key"`
	EarlyAccessList string `toml:"early_access_list"`
}

type Hcaptcha struct {
	SiteKey      string `toml:"site_key"`
	SecretKey    string `toml:"secret_key"`
	LocalDevMode bool   `toml:"local_dev_mode"`
}

type S3Config struct {
	AccessKey       string `toml:"access_key"`
	AccessSecretKey string `toml:"access_secret_key"`
	RecordsBucket   string `toml:"records_bucket"`
	Prefix          string `toml:"prefix"`
}

type GCPStorageConfig struct {
	AccessSecretKey string `toml:"access_secret_key"`
	RecordsBucket   string `toml:"records_bucket"`
	Prefix          string `toml:"prefix"`
}

type ProfilingConfig struct {
	Username string `toml:"username"`
	Password string `toml:"password"`
	Enabled  bool   `toml:"enabled"`
}

type TwitchConfig struct {
	ClientID string `toml:"client_id"`
}

type DiscordConfig struct {
	InfoURL string `toml:"info_url"`
}

type PushNotificationsConfig struct {
	OneSignalEnabled bool   `toml:"onesignal_enabled"`
	OneSignalAppID   string `toml:"onesignal_app_id"`
	OneSignalAppKey  string `toml:"onesignal_app_key"`
}

type AccountConfig struct {
	IDHidePrime int64 `toml:"id_hide_prime"`
	IDHideXor   int64 `toml:"id_hide_xor"`
}

type MatchConfig struct {
	ReplayIDSalt string `toml:"replay_id_salt"`
}

func NewFromFile(file string, env string, cfg interface{}) error {
	if file == "" {
		file = env
	}
	_, err := os.Stat(file)
	if os.IsNotExist(err) {
		return fmt.Errorf("failed to load config file: %w", err)
	}
	if _, err := toml.DecodeFile(file, cfg); err != nil {
		return fmt.Errorf("failed to parse config file: %w", err)
	}
	if configLoader, ok := cfg.(ConfigLoader); ok {
		return configLoader.Load()
	}
	return nil
}

type ConfigLoader interface {
	Load() error
}

var _ ConfigLoader = &Config{}

func (cfg *Config) Load() error {
	// Service mode
	var mode Mode
	switch cfg.Service.Mode {
	case "dev", "development":
		mode = DevelopmentMode
	case "stg", "staging":
		mode = StagingMode
	case "prod", "production":
		mode = ProductionMode
	default:
		return fmt.Errorf("config service.mode value is invalid, must be one of \"development\", \"dev\", \"production\" or \"prod\"")
	}
	cfg.Mode = mode
	cfg.Service.Mode = mode.String()

	// Service name
	if cfg.Service.Name == "" {
		return errors.New("config error: logging.service cannot be empty")
	}

	// Logging
	logLevel, err := zerolog.ParseLevel(strings.ToLower(cfg.Logging.Level))
	if err != nil {
		return fmt.Errorf("unrecognized logging level of '%s'", cfg.Logging.Level)
	}

	log.Printf("setting log level to %s", logLevel.String())
	zerolog.SetGlobalLevel(logLevel)
	zerolog.LevelFieldName = "severity"

	// Validate auth
	if cfg.Auth.JWTSecret == "" || len(cfg.Auth.JWTSecret) < 10 {
		return fmt.Errorf("config auth.jwt_secret must be at least 10 characters long")
	}

	if cfg.Redis.Enabled {
		if cfg.Redis.Host == "" {
			return errors.New("config error: redis.host cannot be empty")
		}

		if cfg.Redis.Port == 0 {
			return errors.New("config error: redis.port cannot be empty")
		}

		if cfg.Redis.MaxIdle <= 0 {
			cfg.Redis.MaxIdle = 20
		}

		if cfg.Redis.MaxActive <= 0 {
			cfg.Redis.MaxActive = 50
		}
	}

	// OpenSky default
	if cfg.OpenSky.ExpMultiplier < 1.0 {
		cfg.OpenSky.ExpMultiplier = 1.0
	}
	if cfg.OpenSky.RewardMultiplier < 1 {
		cfg.OpenSky.RewardMultiplier = 1
	}

	// Leaderboard, time parsing
	layout := "15:04"
	t, err := time.ParseInLocation(layout, cfg.OpenSky.LeaderboardRewards.StrTime, time.UTC)
	if err != nil {
		return fmt.Errorf("config error: leaderboard time parsing failed %w", err)
	}
	cfg.OpenSky.LeaderboardRewards.Time = t

	if len(cfg.OpenSky.LeaderboardRewards.RewardsExcludedCardSetsString) > 0 {
		for _, s := range strings.Split(cfg.OpenSky.LeaderboardRewards.RewardsExcludedCardSetsString, ",") {
			if i, ok := proto.CardSet_value[strings.TrimSpace(s)]; ok {
				cardSet := proto.CardSet(i)

				if cardSet != proto.CardSet_UNKNOWN {
					cfg.OpenSky.LeaderboardRewards.RewardsExcludedCardSets = append(cfg.OpenSky.LeaderboardRewards.RewardsExcludedCardSets, &cardSet)
				}
			}
		}
	}

	// S3Config, sanitize the inputs
	cfg.S3.RecordsBucket = strings.Trim(cfg.S3.RecordsBucket, " /")
	cfg.S3.Prefix = strings.Trim(cfg.S3.Prefix, " /")

	// GCPStorageConfig, sanitize the inputs
	cfg.GCPStorage.RecordsBucket = strings.Trim(cfg.GCPStorage.RecordsBucket, " /")
	cfg.GCPStorage.Prefix = strings.Trim(cfg.GCPStorage.Prefix, " /")

	// Ethereum / Sequence
	if cfg.Ethereum.URL == "" {
		return errors.New("config fail! [ethereum.url] is empty, check your config file")
	}
	if cfg.Ethereum.AuthChainURL == "" {
		return errors.New("config fail! [ethereum.auth_chain_url] is empty, check your config file")
	}
	if cfg.Sequence.APIURL == "" {
		return errors.New("config fail! sequence.api_url is empty, check your config file")
	}
	if cfg.Sequence.IndexerURL == "" {
		return errors.New("config fail! sequence.indexer_url is empty, check your config file")
	}
	if cfg.Sequence.RelayerURL == "" {
		return errors.New("config fail! sequence.relayer_url is empty, check your config file")
	}
	if cfg.Sequence.AccessKey == "" {
		return errors.New("config fail! sequence.access_key is empty, check your config file")
	}

	// Contracts, ensure they are valid addresses
	if h := prototyp.Hash(cfg.Contracts.SkyweaverAssetsContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.opensky_assets_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.USDCContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.usdc_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.LeaderboardSilverRewardsContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.leaderboard_silver_rewards_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.LeaderboardTicketRewardsContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.leaderboard_ticket_rewards_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.FreeConquestEntriesFactory); !h.IsValidAddress() {
		return errors.New("config fail! contracts.free_conquest_entries_factory is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.StickerRewardsContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.sticker_rewards_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.ConquestTreasureSilverRewardsContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.conquest_treasure_silver_rewards_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.CardBackRewardsContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.card_back_rewards_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.SkypassSilverCardsFactory); !h.IsValidAddress() {
		return errors.New("config fail! contracts.skypass_silver_factory_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.SkypassStickersFactory); !h.IsValidAddress() {
		return errors.New("config fail! contracts.skypass_sticker_factory_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.SkypassConquestTicketsFactory); !h.IsValidAddress() {
		return errors.New("config fail! contracts.skypass_conquest_tickets_factory_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.PaymentContract); !h.IsValidAddress() {
		return errors.New("config fail! contracts.payment_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.SilverRewardFactory); !h.IsValidAddress() {
		return errors.New("config fail! contracts.silver_reward_factory_contract is invalid, expecting address 0x..")
	}
	if h := prototyp.Hash(cfg.Contracts.GoldRewardFactory); !h.IsValidAddress() {
		return errors.New("config fail! contracts.gold_reward_factory_contract is invalid, expecting address 0x..")
	}
	if cfg.Profiling.Enabled {
		if cfg.Profiling.Username == "" || cfg.Profiling.Password == "" {
			return errors.New("config fail! profiling requires both username and password")
		}
	}

	if cfg.OpenSky.StickerRewards.CheckForPendingRewardsMinutes < 1 {
		cfg.OpenSky.StickerRewards.CheckForPendingRewardsMinutes = 60
	}
	if cfg.OpenSky.StickerRewards.MintingDelayMinutes < 1 {
		cfg.OpenSky.StickerRewards.MintingDelayMinutes = 60 * 23
	}

	cfg.OpenSky.ConquestV2Config.PoolTTL = time.Duration(cfg.OpenSky.ConquestV2Config.PoolTTLSeconds * int32(time.Second))

	layout = "15:04"

	t, err = time.ParseInLocation(layout, cfg.OpenSky.ConquestV2Config.RewardsScheduleStrTime, time.UTC)
	if err != nil {
		return fmt.Errorf("config error: conquest v2 rewards schedule time parsing failed %w", err)
	}

	cfg.OpenSky.ConquestV2Config.RewardsScheduleTime = t

	t, err = time.ParseInLocation(layout, cfg.OpenSky.ConquestV2Config.RewardsSendStrTime, time.UTC)
	if err != nil {
		return fmt.Errorf("config error: conquest v2 rewards send time parsing failed %w", err)
	}

	cfg.OpenSky.ConquestV2Config.RewardsSendTime = t

	if len(cfg.OpenSky.ConquestV2Config.RewardsExcludedCardSetsString) > 0 {
		for _, s := range strings.Split(cfg.OpenSky.ConquestV2Config.RewardsExcludedCardSetsString, ",") {
			if i, ok := proto.CardSet_value[strings.TrimSpace(s)]; ok {
				cardSet := proto.CardSet(i)

				if cardSet != proto.CardSet_UNKNOWN {
					cfg.OpenSky.ConquestV2Config.RewardsExcludedCardSets = append(cfg.OpenSky.ConquestV2Config.RewardsExcludedCardSets, &cardSet)
				}
			}
		}
	}

	if len(cfg.OpenSky.ConquestV2Config.RewardsWeeklyExclusiveCardSetsString) > 0 {
		for _, s := range strings.Split(cfg.OpenSky.ConquestV2Config.RewardsWeeklyExclusiveCardSetsString, ",") {
			if i, ok := proto.CardSet_value[strings.TrimSpace(s)]; ok {
				cardSet := proto.CardSet(i)

				if cardSet != proto.CardSet_UNKNOWN {
					cfg.OpenSky.ConquestV2Config.RewardsWeeklyExclusiveCardSets = append(cfg.OpenSky.ConquestV2Config.RewardsWeeklyExclusiveCardSets, &cardSet)
				}
			}
		}
	}

	cfg.OpenSky.MobileIAP.GoogleKeyData = strings.TrimSpace(cfg.OpenSky.MobileIAP.GoogleKeyData)

	cfg.OpenSky.MobileIAP.GoogleRetryPeriod = time.Duration(cfg.OpenSky.MobileIAP.GoogleRetryPeriodSeconds * int(time.Second))

	if cfg.OpenSky.OnChainPayment.MonitorPollingIntervalMillisecond == 0 {
		cfg.OpenSky.OnChainPayment.MonitorPollingIntervalMillisecond = 1000
	}

	cfg.OpenSky.OnChainPayment.MonitorPollingInterval = time.Duration(cfg.OpenSky.OnChainPayment.MonitorPollingIntervalMillisecond * int(time.Millisecond))

	if cfg.OpenSky.OnChainPayment.SubscribeIdleTimeoutSeconds == 0 {
		cfg.OpenSky.OnChainPayment.SubscribeIdleTimeoutSeconds = 1
	}

	cfg.OpenSky.OnChainPayment.SubscribeIdleTimeout = time.Duration(cfg.OpenSky.OnChainPayment.SubscribeIdleTimeoutSeconds * int(time.Second))

	if cfg.Account.IDHidePrime > 0 {
		if err := proto.SetAccountIDHidePrime(cfg.Account.IDHidePrime); err != nil {
			return fmt.Errorf("set account ID hide prime: %w", err)
		}
	}

	if cfg.Account.IDHideXor > 0 {
		if err := proto.SetAccountIDHideXor(cfg.Account.IDHideXor); err != nil {
			return fmt.Errorf("set account ID hide xor: %w", err)
		}
	}

	if cfg.Auth.UserLogoutCutoffStr != "" {
		t, err := time.ParseInLocation(time.RFC3339, cfg.Auth.UserLogoutCutoffStr, time.UTC)
		if err != nil {
			return fmt.Errorf("config error: user account logout cuttoff time parsing failed %w", err)
		}
		cfg.Auth.UserLogoutCutoff = &t
		log.Println("auth cutoff set to:", t, t.Unix())

	}

	return nil
}

type Mode uint32

const (
	DevelopmentMode Mode = iota
	StagingMode
	ProductionMode
)

func (m Mode) String() string {
	switch m {
	case DevelopmentMode:
		return "development"
	case StagingMode:
		return "staging"
	case ProductionMode:
		return "production"
	default:
		return ""
	}
}
