package data

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/upper/db/v4"
	"github.com/upper/db/v4/adapter/postgresql"

	"github.com/horizon-games/OpenSky/api/config"
)

var (
	// DB is a global value that provides direct access to db.Session and model
	// stores
	DB *Database
)

// Database merges db.Session and stores.
type Database struct {
	db.Session
}

// NewDBSession sets up a new database session using conf and binds stores to
// struct fields.
func NewDBSession(cfg config.DBConfig) (*Database, error) {
	if len(cfg.Hosts) == 0 {
		return nil, errors.New("failed to connect to DB: no host")
	}
	host := cfg.Hosts[0] // Why do we have multiple hosts anyway?
	connURL, err := postgresql.ParseURL(fmt.Sprintf("postgres://%s:%s@%s/%s?application_name=%v",
		cfg.Username,
		cfg.Password,
		host,
		cfg.Database,
		cfg.AppName,
	))
	if err != nil {
		return nil, err
	}

	dbSession, err := db.Open(postgresql.Adapter, connURL)
	if err != nil {
		return nil, errors.Wrapf(err, "db.Open")
	}

	if cfg.ReportQueryErrors {
		db.LC().SetLevel(db.LogLevelError)
	}

	if cfg.DebugQueries {
		db.LC().SetLevel(db.LogLevelDebug)
	}

	if db.LC().Level() >= db.LogLevelDebug {
		// This is a default logger, it's going to be used only when no other
		// settings are provided. In a regular execution this is meant to be
		// overwritten with the app logger in api.go.
		db.LC().SetLogger(&QueryLogger{zerolog.New(os.Stdout)})
	}

	if cfg.MaxIdleConns > 0 {
		dbSession.SetMaxIdleConns(cfg.MaxIdleConns)
	}

	if cfg.MaxOpenConns > 0 {
		dbSession.SetMaxOpenConns(cfg.MaxOpenConns)
	}

	if durationString := cfg.ConnMaxLifetime; durationString != "" {
		duration, err := time.ParseDuration(durationString)
		if err != nil {
			return nil, fmt.Errorf("failed to parse db.conn_max_lifetime: %w", err)
		}
		dbSession.SetConnMaxLifetime(duration)
	}
	if durationString := cfg.ConnMaxIdleTime; durationString != "" {
		duration, err := time.ParseDuration(durationString)
		if err != nil {
			return nil, fmt.Errorf("failed to parse db.conn_max_idletime: %w", err)
		}
		dbSession.SetConnMaxIdleTime(duration)
	}

	DB = &Database{Session: dbSession}
	return DB, nil
}

func MustNewDBSession(cfg config.DBConfig) {
	if _, err := NewDBSession(cfg); err != nil {
		panic(errors.Wrap(err, "failed to connect to main DB"))
	}

	err := DB.Ping()
	if err != nil {
		panic(err)
	}
}

func (d *Database) Save(m db.Record) error {
	return d.Session.Save(m)
}

func (d *Database) getSession(sess ...db.Session) db.Session {
	if d == nil {
		panic("database was nil")
	}
	if len(sess) < 1 || sess[0] == nil {
		return d.Session
	}
	return sess[0]
}

func (d *Database) Commit(fn func(db.Session) error) error {
	sess := d.getSession(nil)
	if sess == nil {
		return errors.New("missing session")
	}
	err := d.TxContext(context.Background(), fn, nil)
	return err
}

func (d *Database) Accounts(sess ...db.Session) *AccountsStore {
	return &AccountsStore{d.getSession(sess...).Collection("accounts")}
}

func (d *Database) AccountStats(sess ...db.Session) *AccountStatsStore {
	return &AccountStatsStore{d.getSession(sess...).Collection("account_stats")}
}

func (d *Database) Cards(sess ...db.Session) *CardsStore {
	return &CardsStore{d.getSession(sess...).Collection("cards")}
}

func (d *Database) FeedEvents(sess ...db.Session) *FeedEventsStore {
	return &FeedEventsStore{d.getSession(sess...).Collection("feed_events")}
}

func (d *Database) Decks(sess ...db.Session) *DecksStore {
	return &DecksStore{d.getSession(sess...).Collection("decks")}
}

func (d *Database) DeckRanks(sess ...db.Session) *DeckRankStore {
	return &DeckRankStore{d.getSession(sess...).Collection("deck_ranks")}
}

func (d *Database) Matches(sess ...db.Session) *MatchesStore {
	return &MatchesStore{d.getSession(sess...).Collection("matches")}
}

func (d *Database) Items(sess ...db.Session) *ItemStore {
	return &ItemStore{d.getSession(sess...).Collection("items")}
}

func (d *Database) ItemsEquipped(sess ...db.Session) *ItemsEquippedStore {
	return &ItemsEquippedStore{d.getSession(sess...).Collection("items_equipped")}
}

func (d *Database) ItemSummaries(sess ...db.Session) *ItemSummaryStore {
	return &ItemSummaryStore{d.getSession(sess...).Collection("item_summaries")}
}

func (d *Database) UsersStorage(sess ...db.Session) *UserStorageStore {
	return &UserStorageStore{d.getSession(sess...).Collection("user_storage")}
}

func (d *Database) Conquests(sess ...db.Session) *ConquestsStore {
	return &ConquestsStore{d.getSession(sess...).Collection("conquests")}
}

func (d *Database) ConquestPoints(sess ...db.Session) *ConquestPointsStore {
	return &ConquestPointsStore{d.getSession(sess...).Collection("conquest_points")}
}

func (d *Database) CookiePolicies(sess ...db.Session) *CookiePoliciesStore {
	return &CookiePoliciesStore{d.getSession(sess...).Collection("cookie_policies")}
}

func (d *Database) WeeklyGolds(sess ...db.Session) *WeeklyGoldsStore {
	return &WeeklyGoldsStore{d.getSession(sess...).Collection("weekly_golds")}
}

func (d *Database) TaskRunners(sess ...db.Session) *TaskRunnerStore {
	return &TaskRunnerStore{d.getSession(sess...).Collection("task_runners")}
}

func (d *Database) Tasks(sess ...db.Session) *TaskStore {
	return &TaskStore{d.getSession(sess...).Collection("tasks")}
}

func (d *Database) Reports(sess ...db.Session) *ReportsStore {
	return &ReportsStore{d.getSession(sess...).Collection("reports")}
}

func (d *Database) Stickers(sess ...db.Session) *StickersStore {
	return &StickersStore{d.getSession(sess...).Collection("stickers")}
}

func (d *Database) TutorialProgress(sess ...db.Session) *TutorialProgressStore {
	return &TutorialProgressStore{d.getSession(sess...).Collection("tutorial_progress")}
}

func (d *Database) AwardedStickers(sess ...db.Session) *AwardedStickersStore {
	return &AwardedStickersStore{d.getSession(sess...).Collection("awarded_stickers")}
}

func (d *Database) LevelsPerSeason(sess ...db.Session) *LevelsPerSeasonStore {
	return &LevelsPerSeasonStore{d.getSession(sess...).Collection("levels_per_season")}
}

func (d *Database) AccountActions(sess ...db.Session) *AccountActionsStore {
	return &AccountActionsStore{d.getSession(sess...).Collection("account_actions")}
}

func (d *Database) AccountSignals(sess ...db.Session) *AccountSignalsStore {
	return &AccountSignalsStore{d.getSession(sess...).Collection("account_signals")}
}

func (d *Database) IPAddressHistories(sess ...db.Session) *IPAddressHistoriesStore {
	return &IPAddressHistoriesStore{d.getSession(sess...).Collection("ip_address_history")}
}

func (d *Database) UserAgentHistories(sess ...db.Session) *UserAgentHistoriesStore {
	return &UserAgentHistoriesStore{d.getSession(sess...).Collection("ua_history")}
}

func (d *Database) TwitchFeaturedStreamers(sess ...db.Session) *TwitchFeaturedStreamersStore {
	return &TwitchFeaturedStreamersStore{d.getSession(sess...).Collection("twitch_featured_streamers")}
}

func (d *Database) AppDevKeys(sess ...db.Session) *AppDevKeyStore {
	return &AppDevKeyStore{d.getSession(sess...).Collection("app_dev_keys")}
}

func (d *Database) Banners(sess ...db.Session) *BannersStore {
	return &BannersStore{d.getSession(sess...).Collection("banners")}
}

func (d *Database) GameModeStatus(sess ...db.Session) *GameModeStatusStore {
	return &GameModeStatusStore{d.getSession(sess...).Collection("game_mode_status")}
}

func (d *Database) GameModeStatusHistory(sess ...db.Session) *GameModeStatusHistoryStore {
	return &GameModeStatusHistoryStore{d.getSession(sess...).Collection("game_mode_status_history")}
}

func (d *Database) Settings(sess ...db.Session) *SettingsStore {
	return &SettingsStore{d.getSession(sess...).Collection("settings")}
}

func (d *Database) HeroSkins(sess ...db.Session) *HeroSkinsStore {
	return &HeroSkinsStore{d.getSession(sess...).Collection("hero_skins")}
}

func (d *Database) Notifications(sess ...db.Session) *NotificationsStore {
	return &NotificationsStore{d.getSession(sess...).Collection("notifications")}
}

func (d *Database) NotificationsOneTime(sess ...db.Session) *NotificationsOneTimeStore {
	return &NotificationsOneTimeStore{d.getSession(sess...).Collection("notifications_onetime")}
}

func (d *Database) SkypassRewards(sess ...db.Session) *SkypassRewardsStore {
	return &SkypassRewardsStore{d.getSession(sess...).Collection("skypass_rewards")}
}

func (d *Database) SkypassRewardsClaims(sess ...db.Session) *SkypassRewardsClaimsStore {
	return &SkypassRewardsClaimsStore{d.getSession(sess...).Collection("skypass_rewards_claims")}
}

func (d *Database) SkypassSeasonStats(sess ...db.Session) *SkypassSeasonStatsStore {
	return &SkypassSeasonStatsStore{d.getSession(sess...).Collection("skypass_season_stats")}
}

func (d *Database) Payments(sess ...db.Session) *PaymentsStore {
	return &PaymentsStore{d.getSession(sess...).Collection("payments")}
}

func (d *Database) PaymentsLogs(sess ...db.Session) *PaymentsLogsStore {
	return &PaymentsLogsStore{d.getSession(sess...).Collection("payments_logs")}
}

func (d *Database) Transactions(sess ...db.Session) *TransactionStore {
	return &TransactionStore{d.getSession(sess...).Collection("transactions")}
}

func (d *Database) QuestsAssignments(sess ...db.Session) *QuestsAssignmentsStore {
	return &QuestsAssignmentsStore{d.getSession(sess...).Collection("quests_assignments")}
}

func (d *Database) QuestsSpecs(sess ...db.Session) *QuestsSpecsStore {
	return &QuestsSpecsStore{d.getSession(sess...).Collection("quests_specs")}
}
