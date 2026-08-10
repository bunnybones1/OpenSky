package quests

import (
	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

//go:generate go run go.uber.org/mock/mockgen -destination ./mock/metrics_collector.go -package mock . MetricsCollector
type MetricsCollector interface {
	TrackQuestAutoReRoll(proto.QuestPeriodicity, data.QuestPosition)
	TrackQuestManualReRoll(periodicity proto.QuestPeriodicity, position data.QuestPosition, reroll uint16)
	TrackQuestManualClaim(proto.QuestPeriodicity)
	TrackQuestMoveUpInEpic(proto.QuestPeriodicity, data.QuestPosition)
	TrackQuestCopyToCurrentPeriod(proto.QuestPeriodicity, data.QuestPosition)
}
