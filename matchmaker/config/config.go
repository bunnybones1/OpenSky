package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/BurntSushi/toml"
	"github.com/go-chi/telemetry"
	"github.com/rs/zerolog"
)

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

var Instance *Config

type Config struct {
	Mode        Mode `toml:"-"`
	VersionHash string

	Service ServiceConfig `toml:"service"`
	Logging LoggingConfig `toml:"logging"`
	Auth    Auth          `toml:"auth"`

	Redis RedisConfig `toml:"redis"`

	SkyWeaverAPI SkyWeaverAPIConfig `toml:"opensky_api"`
	GameServer   GameServerConfig   `toml:"game_server"`

	Honeybadger Honeybadger    `toml:"honeybadger"`
	HCaptcha    HCaptchaConfig `toml:"hcaptcha"`

	MatchMaker MatchMakerConfig `toml:"matchmaker"`
	Ethereum   EthereumConfig   `toml:"ethereum"`
	Telemetry  telemetry.Config `toml:"telemetry"`
	Testing    TestingConfig    `toml:"testing"`
}

type LoggingConfig struct {
	Level   string `toml:"level"`
	JSON    bool   `toml:"json"`
	Concise bool   `toml:"concise"`
}

type Auth struct {
	JWTSecret string `toml:"jwt_secret"`
}

type RedisConfig struct {
	Disabled           bool          `toml:"disabled"`
	Host               string        `toml:"host"`
	Port               uint16        `toml:"port"`
	DBIndex            int           `toml:"db_index"`   // default 0
	MaxIdle            int           `toml:"max_idle"`   // default 20
	MaxActive          int           `toml:"max_active"` // default 50
	IdleTimeout        time.Duration `toml:"-"`
	IdleTimeoutSeconds float32       `toml:"idle_timeout_seconds"`
}

type ServiceConfig struct {
	// Name that identifies the application
	Name string `toml:"name"`

	// Listen network url for the HTTP/RPC server
	Listen string `toml:"listen"`

	// Mode is the operating mode of the application, one of:
	// "development", "dev", "production" or "prod"
	Mode string `toml:"mode"`
}

type MatchMakerConfig struct {
	AuthenticationTimeout        time.Duration `toml:"-" json:"-"`
	AuthenticationTimeoutSeconds float32       `toml:"authentication_timeout_seconds" json:"authentication_timeout_seconds"`

	MatchAcceptanceTimeout        time.Duration `toml:"-" json:"-"`
	MatchAcceptanceTimeoutSeconds float32       `toml:"match_acceptance_timeout_seconds" json:"match_acceptance_timeout_seconds"`

	MatchAcceptancePenalty        time.Duration `toml:"-" json:"-"`
	MatchAcceptancePenaltySeconds float32       `toml:"match_acceptance_penalty_seconds" json:"match_acceptance_penalty_seconds"`

	MatchRefusalWindow        time.Duration `toml:"-" json:"-"`
	MatchRefusalWindowSeconds float32       `toml:"match_refusal_window_seconds" json:"match_refusal_window_seconds"`

	AllowSameIPMatch       bool   `toml:"allow_same_ip_match" json:"allow_same_ip_match"`
	StrictConquestMatching bool   `toml:"strict_conquest_matching" json:"strict_conquest_matching"`
	MinRankToPlayConquest  uint32 `toml:"min_rank_to_play_conquest" json:"min_rank_to_play_conquest"`
	DirectBalanceFetch     bool   `toml:"direct_balance_fetch" json:"direct_balance_fetch"`

	MatchInterval struct {
		Default          time.Duration `toml:"-" json:"-"`
		DefaultSeconds   float32       `toml:"default_seconds" json:"default_seconds"`
		MakeMatch        time.Duration `toml:"-" json:"-"`
		MakeMatchSeconds float32       `toml:"make_match_seconds" json:"make_match_seconds"`

		Practice struct {
			Bot        time.Duration `toml:"-" json:"-"`
			BotSeconds float32       `toml:"bot_seconds" json:"bot_seconds"`

			PVP        time.Duration `toml:"-" json:"-"`
			PVPSeconds float32       `toml:"pvp_seconds" json:"pvp_seconds"`
		}

		Conquest struct {
			Discovery        time.Duration `toml:"-" json:"-"`
			DiscoverySeconds float32       `toml:"discovery_seconds" json:"discovery_seconds"`

			Constructed        time.Duration `toml:"-" json:"-"`
			ConstructedSeconds float32       `toml:"constructed_seconds" json:"constructed_seconds"`
		} `toml:"conquest" json:"conquest"`

		Challenge struct {
			Discovery        time.Duration `toml:"-" json:"-"`
			DiscoverySeconds float32       `toml:"discovery_seconds" json:"discovery_seconds"`

			Constructed        time.Duration `toml:"-" json:"-"`
			ConstructedSeconds float32       `toml:"constructed_seconds" json:"constructed_seconds"`
		} `toml:"challenge" json:"challenge"`
	} `toml:"match_interval" json:"match_interval"`

	RelaxMatchingRuleInterval MatchMakerRelaxMatchingRuleIntervalConfig `toml:"relax_matching_rule_interval" json:"relax_matching_rule_interval"`

	MatchRefusalPenalty MatchMakerMatchRefusalPenaltyConfig `toml:"match_refusal_penalty" json:"match_refusal_penalty"`

	PlayerBot PlayerBotConfig `toml:"player_bot"`
}

type MatchMakerRelaxMatchingRuleIntervalConfig struct {
	Default        time.Duration `toml:"-" json:"-"`
	DefaultSeconds float32       `toml:"default_seconds" json:"default_seconds"`

	Conquest struct {
		Discovery        time.Duration `toml:"-" json:"-"`
		DiscoverySeconds float32       `toml:"discovery_seconds" json:"discovery_seconds"`

		Constructed        time.Duration `toml:"-" json:"-"`
		ConstructedSeconds float32       `toml:"constructed_seconds" json:"constructed_seconds"`
	} `toml:"conquest" json:"conquest"`

	Ranked struct {
		Discovery        time.Duration `toml:"-" json:"-"`
		DiscoverySeconds float32       `toml:"discovery_seconds" json:"discovery_seconds"`

		Constructed        time.Duration `toml:"-" json:"-"`
		ConstructedSeconds float32       `toml:"constructed_seconds" json:"constructed_seconds"`
	} `toml:"ranked" json:"ranked"`
}

type MatchMakerMatchRefusalPenaltyConfig struct {
	DefaultSeconds []float32 `toml:"default_seconds" json:"default_seconds"`
}

type NatsConfig struct {
	Disabled bool   `toml:"disabled"`
	Host     string `toml:"host"`
	Port     uint16 `toml:"port"`
}

type EthereumConfig struct {
	AuthChainURL string `toml:"auth_chain_url"`
}

type Honeybadger struct {
	APIKey string `toml:"api_key"`
}

type HCaptchaConfig struct {
	Disabled bool   `toml:"disabled"`
	Sitekey  string `toml:"site_key"`
	Secret   string `toml:"secret"`
	Local    bool   `toml:"local"`
	URL      string `toml:"url"`
}

type TestingConfig struct {
	AuthenticationBypassEnabled          bool `toml:"authentication_bypass_enabled"`
	GenerateUserAccounts                 bool `toml:"generate_user_accounts"`
	GenerateMatchID                      bool `toml:"generate_match_id"`
	CaptchaBypassEnabled                 bool `toml:"captcha_bypass_enabled"`
	GameModesStatusBypassEnabled         bool `toml:"game_modes_status_bypass_enabled"`
	PlayerBotBypassWaitTimeChecksEnabled bool `toml:"player_bot_bypass_wait_time_checks_enabled"`
}

type SkyWeaverAPIConfig struct {
	URI                            string        `toml:"uri"`
	AllowInsecureTLS               bool          `toml:"allow_insecure_tls"`
	AuthToken                      string        `toml:"auth_token"`
	GameModesStatusCacheTTL        time.Duration `toml:"-" json:"-"`
	GameModesStatusCacheTTLSeconds float32       `toml:"game_modes_status_cache_ttl_seconds"`
}

type GameServerConfig struct {
	AuthToken        string `toml:"auth_token"`
	AllowInsecureTLS bool   `toml:"allow_insecure_tls"`
}

type PlayerBotConfig struct {
	EnabledInRankedQueue bool `toml:"enabled_in_ranked_queue"`
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

	cfg.VersionHash = ReleaseVersion()

	// Logging
	logLevel, err := zerolog.ParseLevel(strings.ToLower(cfg.Logging.Level))
	if err != nil {
		return fmt.Errorf("unrecognized logging level of '%s'", cfg.Logging.Level)
	}

	zerolog.SetGlobalLevel(logLevel)
	zerolog.LevelFieldName = "severity"

	if !cfg.Redis.Disabled {
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
		if cfg.Redis.IdleTimeoutSeconds <= 0 {
			cfg.Redis.IdleTimeoutSeconds = 10
		}
		cfg.Redis.IdleTimeout = secondsToDuration(cfg.Redis.IdleTimeoutSeconds)
	}

	if cfg.SkyWeaverAPI.URI == "" {
		return errors.New("config error: opensky_api.uri cannot be empty")
	}

	if cfg.SkyWeaverAPI.AuthToken == "" {
		return errors.New("config error: opensky_api.auth_token cannot be empty")
	}

	if cfg.GameServer.AuthToken == "" {
		return errors.New("config error: game_server.auth_token cannot be empty")
	}

	if cfg.SkyWeaverAPI.GameModesStatusCacheTTLSeconds <= 0 {
		cfg.SkyWeaverAPI.GameModesStatusCacheTTLSeconds = 10
	}

	if cfg.MatchMaker.AuthenticationTimeoutSeconds <= 0 {
		cfg.MatchMaker.AuthenticationTimeoutSeconds = 5.0
	}

	if cfg.MatchMaker.MatchAcceptanceTimeoutSeconds <= 0 {
		cfg.MatchMaker.MatchAcceptanceTimeoutSeconds = 30
	}
	if cfg.MatchMaker.MatchAcceptancePenaltySeconds <= 0 {
		cfg.MatchMaker.MatchAcceptancePenaltySeconds = 20
	}

	if cfg.MatchMaker.MatchRefusalWindowSeconds <= 0 {
		cfg.MatchMaker.MatchRefusalWindowSeconds = 86400
	}

	if cfg.MatchMaker.MatchInterval.DefaultSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.DefaultSeconds = 2
	}
	if cfg.MatchMaker.MatchInterval.MakeMatchSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.MakeMatchSeconds = 2
	}
	if cfg.MatchMaker.MatchInterval.Practice.BotSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.Practice.BotSeconds = 5
	}
	if cfg.MatchMaker.MatchInterval.Practice.PVPSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.Practice.PVPSeconds = 5
	}
	if cfg.MatchMaker.MatchInterval.Conquest.DiscoverySeconds <= 0 {
		cfg.MatchMaker.MatchInterval.Conquest.DiscoverySeconds = cfg.MatchMaker.MatchInterval.DefaultSeconds
	}
	if cfg.MatchMaker.MatchInterval.Conquest.ConstructedSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.Conquest.ConstructedSeconds = cfg.MatchMaker.MatchInterval.DefaultSeconds
	}
	if cfg.MatchMaker.MatchInterval.Challenge.DiscoverySeconds <= 0 {
		cfg.MatchMaker.MatchInterval.Challenge.DiscoverySeconds = 2
	}
	if cfg.MatchMaker.MatchInterval.Challenge.ConstructedSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.Challenge.ConstructedSeconds = 2
	}

	if cfg.MatchMaker.RelaxMatchingRuleInterval.DefaultSeconds <= 0 {
		cfg.MatchMaker.MatchInterval.DefaultSeconds = 60
	}
	if cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.DiscoverySeconds <= 0 {
		cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.DiscoverySeconds = cfg.MatchMaker.RelaxMatchingRuleInterval.DefaultSeconds
	}
	if cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.ConstructedSeconds <= 0 {
		cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.ConstructedSeconds = cfg.MatchMaker.RelaxMatchingRuleInterval.DefaultSeconds
	}

	cfg.SkyWeaverAPI.GameModesStatusCacheTTL = secondsToDuration(cfg.SkyWeaverAPI.GameModesStatusCacheTTLSeconds)

	cfg.MatchMaker.MatchAcceptanceTimeout = secondsToDuration(cfg.MatchMaker.MatchAcceptanceTimeoutSeconds)
	cfg.MatchMaker.MatchAcceptancePenalty = secondsToDuration(cfg.MatchMaker.MatchAcceptancePenaltySeconds)

	cfg.MatchMaker.MatchRefusalWindow = secondsToDuration(cfg.MatchMaker.MatchRefusalWindowSeconds)

	cfg.MatchMaker.MatchInterval.Default = secondsToDuration(cfg.MatchMaker.MatchInterval.DefaultSeconds)
	cfg.MatchMaker.MatchInterval.MakeMatch = secondsToDuration(cfg.MatchMaker.MatchInterval.MakeMatchSeconds)
	cfg.MatchMaker.MatchInterval.Practice.Bot = secondsToDuration(cfg.MatchMaker.MatchInterval.Practice.BotSeconds)
	cfg.MatchMaker.MatchInterval.Practice.PVP = secondsToDuration(cfg.MatchMaker.MatchInterval.Practice.PVPSeconds)
	cfg.MatchMaker.MatchInterval.Conquest.Discovery = secondsToDuration(cfg.MatchMaker.MatchInterval.Conquest.DiscoverySeconds)
	cfg.MatchMaker.MatchInterval.Conquest.Constructed = secondsToDuration(cfg.MatchMaker.MatchInterval.Conquest.ConstructedSeconds)
	cfg.MatchMaker.MatchInterval.Challenge.Discovery = secondsToDuration(cfg.MatchMaker.MatchInterval.Challenge.DiscoverySeconds)
	cfg.MatchMaker.MatchInterval.Challenge.Constructed = secondsToDuration(cfg.MatchMaker.MatchInterval.Challenge.ConstructedSeconds)

	cfg.MatchMaker.RelaxMatchingRuleInterval.Default = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.DefaultSeconds)
	cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.Discovery = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.DiscoverySeconds)
	cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.Constructed = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.ConstructedSeconds)
	cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.Discovery = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.DiscoverySeconds)
	cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.Constructed = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.ConstructedSeconds)

	cfg.MatchMaker.AuthenticationTimeout = secondsToDuration(cfg.MatchMaker.AuthenticationTimeoutSeconds)

	if mode == ProductionMode {
		cfg.Testing = TestingConfig{} // do not allow testing mode in prod for any reason
	}

	return nil
}

func secondsToDuration(seconds float32) time.Duration {
	return time.Duration(seconds * float32(time.Second))
}
