package conquestv2

import (
	"context"
	"fmt"

	"github.com/upper/db/v4"

	"github.com/horizon-games/OpenSky/api/data"
	"github.com/horizon-games/OpenSky/api/proto"
)

// TreasureLevelSummaryGetterImpl provides summary of treasure levels.
type TreasureLevelSummaryGetterImpl struct {
}

// NewTreasureLevelSummaryGetter instantiates a new TreasureLevelSummaryGetterImpl.
func NewTreasureLevelSummaryGetter() *TreasureLevelSummaryGetterImpl {
	return &TreasureLevelSummaryGetterImpl{}
}

// Get gets a summary info for every treasure level.
func (t *TreasureLevelSummaryGetterImpl) Get(ctx context.Context) ([]*proto.ConquestV2TreasureLevelSummary, error) {
	var summaries []*proto.ConquestV2TreasureLevelSummary

	for i := 1; i < len(treasureLevelToTotalPointsMap); i++ {
		level := treasureLevel(i)

		count, err := t.getNumberOfPlayersInLevel(ctx, level)
		if err != nil {
			return nil, fmt.Errorf("get number of players for level %d: %w", level, err)
		}

		summary := &proto.ConquestV2TreasureLevelSummary{
			Level:           uint16(level),
			NumberOfPlayers: count,
			TotalWeight:     float32(count) * treasureLevelToTotalWeightMap[level],
		}

		summaries = append(summaries, summary)
	}

	return summaries, nil
}

func (t *TreasureLevelSummaryGetterImpl) getNumberOfPlayersInLevel(_ context.Context, level treasureLevel) (int32, error) {
	cond := db.And(
		db.Cond{"event_id": EventID},
		db.Cond{"current_points": db.Gte(treasureLevelToTotalPointsMap[level])},
	)

	if int(level) < len(treasureLevelToTotalPointsMap)-1 {
		cond = cond.And(db.Cond{"current_points": db.Lt(treasureLevelToTotalPointsMap[level+1])})
	}

	result := data.DB.ConquestPoints(nil).Find(cond)

	count, err := result.Count()
	if err != nil {
		return 0, fmt.Errorf("find number of players: %w", err)
	}

	return int32(count), nil
}
