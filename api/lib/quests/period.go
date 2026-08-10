package quests

import (
	"math"
	"time"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

func GetPeriodInTime(periodicity proto.QuestPeriodicity, ts time.Time) uint16 {
	var period uint16

	season1StartTime := data.SeasonStartTime(1)

	switch periodicity {
	case proto.QuestPeriodicity_DAILY:
		period = uint16(math.Floor(ts.Sub(season1StartTime).Hours() / 24))
	case proto.QuestPeriodicity_WEEKLY:
		period = uint16(math.Floor(ts.Sub(season1StartTime).Hours() / (24 * 7)))
	case proto.QuestPeriodicity_SEASONAL:
		period = uint16(math.Floor(ts.Sub(season1StartTime).Hours() / (24 * 7 * 4)))
	}

	period++

	return period
}

func GetCurrentPeriod(periodicity proto.QuestPeriodicity) uint16 {
	return GetPeriodInTime(periodicity, data.TimeNowUTC())
}
