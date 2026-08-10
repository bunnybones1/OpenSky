package signals

import "github.com/horizon-games/OpenSky/api/proto"

const (
	USER_REPORT           = "user report"
	USER_REPORT_COUNT     = "user report count"
	USER_REPORTS_PER_GAME = "user reports per game"
	USER_FAKED_BOT        = "user faked bot matches"
)

type UserReport struct {
	MatchID    uint64     `json:"matchId"`
	ReportedBy proto.Hash `json:"reportedBy"`
	Comment    string     `json:"comment"`
}
