package data

import (
	"fmt"
	"math"
	"time"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/lib/ranking"
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	// ELO_DEFAULT_CONQUEST is the starting, default for conquest
	ELO_DEFAULT_CONQUEST = 0

	MatchDefaultRP = 200

	// WeekInSeconds is the number of seconds in a week
	WeekInSeconds = int64(3600 * 24 * 7)

	// SeasonInSeconds is the number of seconds in a season
	SeasonInSeconds = WeekInSeconds * 4

	accountNameMinLen = 4
	accountNameMaxLen = 20
)

var (
	firstSeasonStart = time.Date(2021, 11, 22, 14, 00, 0, 0, time.UTC)

	seasonNames = map[uint16]string{
		16: "Hex",
		17: "Arcadeum",
		18: "Yard Sale",
		19: "Clockwork",
		20: "Deep Sea",
		21: "Magical",
		22: "Vacation",
		23: "Shroomy",
		24: "Stinky Eye",
		25: "Treasure Map",
		26: "Pumpkin",
		27: "Armis",
		28: "Frosted",
		29: "Waterful!",
		30: "Picnic",
		31: "Ode To Lotus",
		32: "Ode To Ari",

		33: "Hex Redux",
		34: "Arcadeum Redux",
		35: "Yard Sale Redux",
		36: "Clockwork Redux",
		37: "Deep Sea Redux",
		38: "Magical Redux",
		39: "Vacation Redux",
		40: "Shroomy Redux",
		41: "Stinky Eye Redux",
		42: "Treasure Map Redux",
		43: "Pumpkin Redux",
		44: "Armis Redux",
		45: "Frosted Redux",
		46: "Waterful! Redux",
		47: "Picnic Redux",
		48: "Ode To Lotus Redux",
		49: "Ode To Ari Redux",

		50: "Hex Redux",
		51: "Arcadeum Redux",
		52: "Yard Sale Redux",
		53: "Clockwork Redux",
		54: "Deep Sea Redux",
		55: "Magical Redux",
		56: "Vacation Redux",
		57: "Shroomy Redux",
		58: "Stinky Eye Redux",
		59: "Treasure Map Redux",
		60: "Pumpkin Redux",
		61: "Armis Redux",
		62: "Frosted Redux",
		63: "Waterful! Redux",
		64: "Picnic Redux",
		65: "Ode To Lotus Redux",
		66: "Ode To Ari Redux",

		67: "Hex Redux",
		68: "Arcadeum Redux",
		69: "Yard Sale Redux",
		70: "Clockwork Redux",
		71: "Deep Sea Redux",
		72: "Magical Redux",
		73: "Vacation Redux",
		74: "Shroomy Redux",
		75: "Stinky Eye Redux",
		76: "Treasure Map Redux",
		77: "Pumpkin Redux",
		78: "Armis Redux",
		79: "Frosted Redux",
		80: "Waterful! Redux",
		81: "Picnic Redux",
		82: "Ode To Lotus Redux",
		83: "Ode To Ari Redux",
	}
)

func CurrentSeason() uint16 {
	return SeasonFromTimestamp(time.Now())
}

func CurrentSeasonWeek() (uint16, uint8) {
	return SeasonWeekFromTimestamp(time.Now())
}

func CurrentSeasonStart() int64 {
	return firstSeasonStart.Unix() + int64(CurrentSeason()-1)*SeasonInSeconds + 1
}

func CurrentSeasonEnd() int64 {
	return firstSeasonStart.Unix() + int64(CurrentSeason())*SeasonInSeconds
}

func SeasonStartTime(season uint16) time.Time {
	if season < 1 {
		panic("minimum season is 1")
	}
	ts := firstSeasonStart.Unix() + int64(season-1)*SeasonInSeconds
	return time.Unix(ts, 0).UTC()
}

func SeasonWeekStartTime(season uint16, week uint8) time.Time {
	if week < 1 {
		panic("minimum week is 1")
	}
	return SeasonStartTime(season).Add(time.Second * time.Duration(int64(week-1)*WeekInSeconds))
}

func SeasonWeekFromTimestamp(ts time.Time) (uint16, uint8) {
	if ts.Before(firstSeasonStart) {
		panic("cannot accept time before first season")
	}

	season := uint16((ts.UTC().Unix()-firstSeasonStart.Unix())/SeasonInSeconds + 1)
	weeks := math.Floor(float64(ts.Sub(SeasonStartTime(season))/time.Second) / float64(WeekInSeconds))

	return season, uint8(weeks + 1)
}

func SeasonFromTimestamp(ts time.Time) uint16 {
	if ts.Before(firstSeasonStart) {
		panic("cannot accept time before first season")
	}
	return uint16((ts.UTC().Unix()-firstSeasonStart.Unix())/SeasonInSeconds + 1)
}

func SeasonName(season uint16) string {
	name, ok := seasonNames[season]
	if !ok {
		return "unknown"
	}

	return name
}

type AccountStat struct {
	*proto.AccountStat
}

func (a *AccountStat) Store(sess db.Session) db.Store {
	return DB.AccountStats(sess)
}

func (a *AccountStat) BeforeUpdate(sess db.Session) error {
	return a.beforeSave(sess)
}

func (a *AccountStat) BeforeCreate(sess db.Session) error {
	return a.beforeSave(sess)
}

func (a *AccountStat) beforeSave(_ db.Session) error {
	if a.GameMode == proto.GameMode_RANKED_DISCOVERY || a.GameMode == proto.GameMode_RANKED_CONSTRUCTED {
		if a.PlayerRankState.Win != ranking.OutcomeUndefined {
			a.Score = &a.PlayerRankState.RP
		}
	}
	return nil
}

// Validate returns an error if the account does not pass validation rules.
func (a *AccountStat) Validate() error {
	if !a.AccountID.IsValid() {
		return fmt.Errorf("missing account ID")
	}

	if a.PlayerRank == proto.PlayerRank_UNKNOWN {
		a.PlayerRank = proto.PlayerRank_UNRANKED
	}

	return nil
}

func DefaultAccountStats(accountID proto.AccountID, mode proto.GameMode) *proto.AccountStat {
	return &proto.AccountStat{
		AccountID:       accountID,
		GameMode:        mode,
		PlayerRank:      proto.PlayerRank_UNRANKED,
		PlayerRankStage: proto.PlayerRankStage_STAGE_NONE,
	}
}

func OverrideFirstSeasonStart(seasonStart time.Time) {
	firstSeasonStart = seasonStart
}

var (
	_ interface {
		db.Record
		db.Validator
		db.BeforeUpdateHook
		db.BeforeCreateHook
	} = &AccountStat{}
)
