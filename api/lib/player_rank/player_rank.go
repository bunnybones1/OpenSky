package playerRank

import (
	"github.com/horizon-games/OpenSky/api/proto"
)

const (
	DefaultRank      = proto.PlayerRank_UNRANKED
	DefaultRankStage = proto.PlayerRankStage_STAGE_NONE

	MinimumRankForRanked      = proto.PlayerRank_WANDERER
	MinimumRankStageForRanked = proto.PlayerRankStage_STAGE_NONE

	MinimumExpForRanked   = 200
	MinimumLevelForRanked = 1
)

type PlayerRank struct {
	Rank           proto.PlayerRank
	Stage          proto.PlayerRankStage
	RPMin          int32
	XPMin          int32
	HardFloor      bool
	HardFloorValue int32
	SoftResetValue int32
	HardResetValue int32
	XPReward       int32
}

var PlayerRanksTable = []PlayerRank{
	{
		Rank:           proto.PlayerRank_UNRANKED,
		Stage:          proto.PlayerRankStage_STAGE_NONE,
		RPMin:          0,
		XPMin:          0,
		HardFloor:      true,
		HardFloorValue: 0,
		SoftResetValue: 0,
		HardResetValue: 0,
		XPReward:       0,
	},
	{
		Rank:           proto.PlayerRank_WANDERER,
		Stage:          proto.PlayerRankStage_STAGE_I,
		RPMin:          0,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 0,
		SoftResetValue: 0,
		HardResetValue: 0,
		XPReward:       0,
	},
	{
		Rank:           proto.PlayerRank_WANDERER,
		Stage:          proto.PlayerRankStage_STAGE_II,
		RPMin:          100,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 100,
		SoftResetValue: 0,
		HardResetValue: 0,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_WANDERER,
		Stage:          proto.PlayerRankStage_STAGE_III,
		RPMin:          200,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 200,
		SoftResetValue: 0,
		HardResetValue: 0,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_TRAINEE,
		Stage:          proto.PlayerRankStage_STAGE_I,
		RPMin:          300,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 300,
		SoftResetValue: 0,
		HardResetValue: 300,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_TRAINEE,
		Stage:          proto.PlayerRankStage_STAGE_II,
		RPMin:          400,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 400,
		SoftResetValue: 0,
		HardResetValue: 350,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_TRAINEE,
		Stage:          proto.PlayerRankStage_STAGE_III,
		RPMin:          500,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 500,
		SoftResetValue: 0,
		HardResetValue: 400,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_APPRENTICE,
		Stage:          proto.PlayerRankStage_STAGE_I,
		RPMin:          600,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 600,
		SoftResetValue: 0,
		HardResetValue: 600,
		XPReward:       200,
	},
	{
		Rank:           proto.PlayerRank_APPRENTICE,
		Stage:          proto.PlayerRankStage_STAGE_II,
		RPMin:          700,
		XPMin:          MinimumExpForRanked,
		HardFloor:      false,
		HardFloorValue: 0,
		SoftResetValue: 0,
		HardResetValue: 650,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_APPRENTICE,
		Stage:          proto.PlayerRankStage_STAGE_III,
		RPMin:          800,
		XPMin:          MinimumExpForRanked,
		HardFloor:      false,
		HardFloorValue: 0,
		SoftResetValue: 750,
		HardResetValue: 700,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_EXPERT,
		Stage:          proto.PlayerRankStage_STAGE_I,
		RPMin:          900,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 900,
		SoftResetValue: 0,
		HardResetValue: 750,
		XPReward:       300,
	},
	{
		Rank:           proto.PlayerRank_EXPERT,
		Stage:          proto.PlayerRankStage_STAGE_II,
		RPMin:          1000,
		XPMin:          MinimumExpForRanked,
		HardFloor:      false,
		HardFloorValue: 0,
		SoftResetValue: 0,
		HardResetValue: 800,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_EXPERT,
		Stage:          proto.PlayerRankStage_STAGE_III,
		RPMin:          1100,
		XPMin:          MinimumExpForRanked,
		HardFloor:      false,
		HardFloorValue: 0,
		SoftResetValue: 0,
		HardResetValue: 850,
		XPReward:       100,
	},
	{
		Rank:           proto.PlayerRank_MASTER,
		Stage:          proto.PlayerRankStage_STAGE_NONE,
		RPMin:          1200,
		XPMin:          MinimumExpForRanked,
		HardFloor:      true,
		HardFloorValue: 1200,
		SoftResetValue: 1300,
		HardResetValue: 900,
		XPReward:       400,
	},
	{
		Rank:           proto.PlayerRank_GRANDWEAVER,
		Stage:          proto.PlayerRankStage_STAGE_NONE,
		RPMin:          1200,
		XPMin:          MinimumExpForRanked,
		HardFloor:      false,
		HardFloorValue: 1200,
		SoftResetValue: 1400,
		HardResetValue: 1000,
		XPReward:       0,
	}, // this is never reached, it's granted based on external conditions
}

func (r PlayerRank) PrevRank() PlayerRank {
	var curr int
	for i := 0; i < len(PlayerRanksTable); i++ {
		row := PlayerRanksTable[i]
		if row.Rank == r.Rank && row.Stage == r.Stage {
			curr = i // current rank
			break
		}
	}
	if curr-1 >= 0 {
		return PlayerRanksTable[curr-1]
	}
	return PlayerRanksTable[0]
}

func (r PlayerRank) NextRank() PlayerRank {
	var curr int
	for i := 0; i < len(PlayerRanksTable); i++ {
		row := PlayerRanksTable[i]
		if row.Rank == r.Rank && row.Stage == r.Stage {
			curr = i // current rank
			break
		}
	}
	if PlayerRanksTable[curr].Rank == proto.PlayerRank_MASTER {
		// maximum rank achievable by RP
		return PlayerRanksTable[curr]
	}
	if curr+1 < len(PlayerRanksTable) {
		return PlayerRanksTable[curr+1]
	}
	return PlayerRanksTable[len(PlayerRanksTable)-1]
}

func (r PlayerRank) NextRankRPMin() int32 {
	nextRank := r.NextRank()
	return nextRank.RPMin
}

func (r PlayerRank) Add(newRP int32, newXP int32) (PlayerRank, int32, int32) {
	if newRP < r.RPMin {
		if r.HardFloor {
			return r, r.HardFloorValue, 0
		}
		return r.PrevRank(), newRP, 0
	}

	nextRank := r.NextRank()
	if newXP >= nextRank.XPMin && newRP >= nextRank.RPMin {
		return nextRank, newRP, nextRank.XPReward
	}

	return r, newRP, 0
}

func LookupRankByType(r proto.PlayerRank, s proto.PlayerRankStage) PlayerRank {
	for i := 0; i < len(PlayerRanksTable); i++ {
		row := PlayerRanksTable[i]
		if row.Rank == r && row.Stage == s {
			return row
		}
	}
	// minimum rank
	return PlayerRanksTable[0]
}

func LookupRankByScore(rp int32) PlayerRank {
	return LookupRankByScoreAndXP(rp, MinimumExpForRanked)
}

func LookupRankByScoreAndXP(rp int32, xp int32) PlayerRank {
	for i := len(PlayerRanksTable) - 1; i >= 0; i-- {
		row := PlayerRanksTable[i]
		if row.Rank == proto.PlayerRank_GRANDWEAVER {
			continue // not a rank that can be earned only by points
		}
		if rp >= row.RPMin && xp >= row.XPMin {
			return row
		}
	}
	if xp >= MinimumExpForRanked {
		return LookupRankByType(MinimumRankForRanked, MinimumRankStageForRanked)
	}
	// minimum rank
	return LookupRankByType(DefaultRank, DefaultRankStage)
}

// IsRankStageUp returns true if rp1 is considered a better rank
// stage than rp2
func IsRankStageUp(rp1 PlayerRank, rp2 PlayerRank) bool {
	if rp1.Rank > rp2.Rank {
		return true
	}
	if rp1.Rank == rp2.Rank {
		return rp1.Stage > rp2.Stage
	}
	return false
}

func getNewRank(rpOld int32, rp int32, xp int32) (PlayerRank, int32) {
	rkOld := LookupRankByScoreAndXP(rpOld, xp)
	rk := LookupRankByScoreAndXP(rp, xp)
	if rp >= rpOld {
		// there's no upper hard floor
		if rk.HardFloor && rp < rk.HardFloorValue {
			return rk, rk.HardFloorValue
		}
		return rk, rp
	}

	// new RP is lower than old RP
	if rkOld.HardFloor {
		// do not allow demotion, honor hard floor
		if rp < rkOld.HardFloorValue {
			return rkOld, rkOld.HardFloorValue
		}
		return rkOld, rp
	}

	// new RP will hit new rank's own hard floor
	if rk.HardFloor {
		// do not allow demotion, honor hard floor
		if rp < rk.HardFloorValue {
			return rk, rk.HardFloorValue
		}
		return rk, rp
	}

	// allow demotion
	if rp < rk.RPMin {
		return rk, rk.RPMin
	}

	return rk, rp
}
