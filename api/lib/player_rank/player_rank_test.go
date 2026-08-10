package playerRank

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/horizon-games/OpenSky/api/proto"
)

func TestLookupRankByScoreAndXP(t *testing.T) {
	testCases := []struct {
		Score int32
		XP    int32
		Rank  proto.PlayerRank
		Stage proto.PlayerRankStage
	}{
		{
			-1,
			-1,
			proto.PlayerRank_UNRANKED,
			proto.PlayerRankStage_STAGE_NONE,
		},
		{
			0,
			0,
			proto.PlayerRank_UNRANKED,
			proto.PlayerRankStage_STAGE_NONE,
		},
		{
			0,
			199,
			proto.PlayerRank_UNRANKED,
			proto.PlayerRankStage_STAGE_NONE,
		},
		{
			0,
			200,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			0,
			2000,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			0,
			2000,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			99,
			300,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			100,
			300,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_II,
		},
		{
			100,
			200,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_II,
		},
		{
			100,
			199,
			proto.PlayerRank_UNRANKED,
			proto.PlayerRankStage_STAGE_NONE,
		},
		{
			200,
			200,
			proto.PlayerRank_WANDERER,
			proto.PlayerRankStage_STAGE_III,
		},
		{
			300,
			200,
			proto.PlayerRank_TRAINEE,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			400,
			200,
			proto.PlayerRank_TRAINEE,
			proto.PlayerRankStage_STAGE_II,
		},
		{
			500,
			200,
			proto.PlayerRank_TRAINEE,
			proto.PlayerRankStage_STAGE_III,
		},
		{
			600,
			200,
			proto.PlayerRank_APPRENTICE,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			700,
			200,
			proto.PlayerRank_APPRENTICE,
			proto.PlayerRankStage_STAGE_II,
		},
		{
			800,
			200,
			proto.PlayerRank_APPRENTICE,
			proto.PlayerRankStage_STAGE_III,
		},
		{
			900,
			200,
			proto.PlayerRank_EXPERT,
			proto.PlayerRankStage_STAGE_I,
		},
		{
			1000,
			200,
			proto.PlayerRank_EXPERT,
			proto.PlayerRankStage_STAGE_II,
		},
		{
			1100,
			200,
			proto.PlayerRank_EXPERT,
			proto.PlayerRankStage_STAGE_III,
		},
		{
			1200,
			200,
			proto.PlayerRank_MASTER,
			proto.PlayerRankStage_STAGE_NONE,
		},
		{
			12000,
			200,
			proto.PlayerRank_MASTER,
			proto.PlayerRankStage_STAGE_NONE,
		},
	}

	for i, testCase := range testCases {
		row := LookupRankByScoreAndXP(testCase.Score, testCase.XP)
		assert.Equal(t, testCase.Rank, row.Rank, fmt.Sprintf("failed test case %d: got %v, expecting %v", i, row.Rank, testCase.Rank))
		assert.Equal(t, testCase.Stage, row.Stage, fmt.Sprintf("failed test case %d: got %v, expecting %v", i, row.Stage, testCase.Stage))
	}
}

func TestGetNewRank(t *testing.T) {
	testCases := []struct {
		RPOld int32
		RP    int32
		XP    int32
		RPOut int32
		Rank  proto.PlayerRank
		Stage proto.PlayerRankStage
	}{
		{
			RPOld: 0,
			RP:    0,
			XP:    199,
			RPOut: 0,
			Rank:  proto.PlayerRank_UNRANKED,
			Stage: proto.PlayerRankStage_STAGE_NONE,
		},
		{
			RPOld: 10,
			RP:    -20,
			XP:    200,
			RPOut: 0,
			Rank:  proto.PlayerRank_WANDERER,
			Stage: proto.PlayerRankStage_STAGE_I,
		},
		{
			RPOld: 99,
			RP:    100,
			XP:    200,
			RPOut: 100,
			Rank:  proto.PlayerRank_WANDERER,
			Stage: proto.PlayerRankStage_STAGE_II,
		},
		{
			RPOld: 199,
			RP:    210,
			XP:    200,
			RPOut: 210,
			Rank:  proto.PlayerRank_WANDERER,
			Stage: proto.PlayerRankStage_STAGE_III,
		},
		{
			RPOld: 220,
			RP:    190,
			XP:    200,
			RPOut: 200,
			Rank:  proto.PlayerRank_WANDERER,
			Stage: proto.PlayerRankStage_STAGE_III,
		},
		{
			RPOld: 220,
			RP:    410,
			XP:    200,
			RPOut: 410,
			Rank:  proto.PlayerRank_TRAINEE,
			Stage: proto.PlayerRankStage_STAGE_II,
		},
		{
			RPOld: 410,
			RP:    290,
			XP:    200,
			RPOut: 400,
			Rank:  proto.PlayerRank_TRAINEE,
			Stage: proto.PlayerRankStage_STAGE_II,
		},
		{
			RPOld: 310,
			RP:    290,
			XP:    200,
			RPOut: 300,
			Rank:  proto.PlayerRank_TRAINEE,
			Stage: proto.PlayerRankStage_STAGE_I,
		},
		{
			RPOld: 610,
			RP:    290,
			XP:    200,
			RPOut: 600,
			Rank:  proto.PlayerRank_APPRENTICE,
			Stage: proto.PlayerRankStage_STAGE_I,
		},
		{
			RPOld: 710,
			RP:    690,
			XP:    200,
			RPOut: 690,
			Rank:  proto.PlayerRank_APPRENTICE,
			Stage: proto.PlayerRankStage_STAGE_I,
		},
		{
			RPOld: 710,
			RP:    702,
			XP:    200,
			RPOut: 702,
			Rank:  proto.PlayerRank_APPRENTICE,
			Stage: proto.PlayerRankStage_STAGE_II,
		},
		{
			RPOld: 890,
			RP:    910,
			XP:    200,
			RPOut: 910,
			Rank:  proto.PlayerRank_EXPERT,
			Stage: proto.PlayerRankStage_STAGE_I,
		},
		{
			RPOld: 910,
			RP:    890,
			XP:    200,
			RPOut: 900,
			Rank:  proto.PlayerRank_EXPERT,
			Stage: proto.PlayerRankStage_STAGE_I,
		},
		{
			RPOld: 1200,
			RP:    1190,
			XP:    200,
			RPOut: 1200,
			Rank:  proto.PlayerRank_MASTER,
			Stage: proto.PlayerRankStage_STAGE_NONE,
		},
		{
			RPOld: 1200,
			RP:    1900,
			XP:    200,
			RPOut: 1900,
			Rank:  proto.PlayerRank_MASTER,
			Stage: proto.PlayerRankStage_STAGE_NONE,
		},
	}

	for i, testCase := range testCases {
		rk, rp := getNewRank(testCase.RPOld, testCase.RP, testCase.XP)
		assert.Equal(t, testCase.RPOut, rp, fmt.Sprintf("failed test case %d", i))
		assert.Equal(t, testCase.Rank, rk.Rank, fmt.Sprintf("failed test case %d: got %v, expecting %v", i, rk.Rank, testCase.Rank))
		assert.Equal(t, testCase.Stage, rk.Stage, fmt.Sprintf("failed test case %d: got %v, expecting %v", i, rk.Stage, testCase.Stage))
	}
}

func TestRankUp(t *testing.T) {
	t.Parallel()

	for _, rules := range PlayerRanksTable {
		rank := rules.Rank
		nextRankRules := rules.NextRank()

		if rules.Rank == proto.PlayerRank_GRANDWEAVER {
			break
		}

		if rules.RPMin <= 0 {
			// Skip XP-only ranks
			continue
		}

		// starting with 0
		winStreak := uint32(0)
		for rp := rules.RPMin; rp <= nextRankRules.RPMin; rp += 100 {
			newRank, newPoints, expBonus := rules.Add(rp, MinimumExpForRanked)

			if rp < nextRankRules.RPMin {
				assert.Equal(t, rank, newRank.Rank)
				assert.Equal(t, int32(0), expBonus)
				assert.Equal(t, rp, newPoints)
			} else {
				assert.Equal(t, nextRankRules.Rank, newRank.Rank)
				assert.Equal(t, nextRankRules.XPReward, expBonus)
				assert.Equal(t, nextRankRules.RPMin, newPoints)
			}

			winStreak++
		}
	}

	{
		wandererRank := LookupRankByType(proto.PlayerRank_WANDERER, proto.PlayerRankStage_STAGE_I)

		currentRank := wandererRank
		for rp := 0; rp <= 2000; rp += 13 {
			newRank, newPoints, _ := currentRank.Add(int32(rp), MinimumExpForRanked)
			assert.Equal(t, int32(rp), newPoints)

			switch {
			case rp < 100:
				assert.Equal(t, proto.PlayerRank_WANDERER, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, newRank.Stage)
			case rp < 200:
				assert.Equal(t, proto.PlayerRank_WANDERER, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, newRank.Stage)
			case rp < 300:
				assert.Equal(t, proto.PlayerRank_WANDERER, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, newRank.Stage)
			case rp < 400:
				assert.Equal(t, proto.PlayerRank_TRAINEE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, newRank.Stage)
			case rp < 500:
				assert.Equal(t, proto.PlayerRank_TRAINEE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, newRank.Stage)
			case rp < 600:
				assert.Equal(t, proto.PlayerRank_TRAINEE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, newRank.Stage)
			case rp < 700:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, newRank.Stage)
			case rp < 800:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, newRank.Stage)
			case rp < 900:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, newRank.Stage)
			case rp < 1000:
				assert.Equal(t, proto.PlayerRank_EXPERT, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, newRank.Stage)
			case rp < 1100:
				assert.Equal(t, proto.PlayerRank_EXPERT, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, newRank.Stage)
			case rp < 1200:
				assert.Equal(t, proto.PlayerRank_EXPERT, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, newRank.Stage)
			case rp < 10000:
				assert.Equal(t, proto.PlayerRank_MASTER, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_NONE, newRank.Stage)
			}

			currentRank = newRank
		}
	}

	// test ranks that can't rank up
	masterRank := LookupRankByType(proto.PlayerRank_MASTER, proto.PlayerRankStage_STAGE_NONE)
	grandmasterRank := LookupRankByType(proto.PlayerRank_GRANDWEAVER, proto.PlayerRankStage_STAGE_NONE)

	for rp := 0; rp < 2000; rp += 100 {
		{
			newRank, newPoints, _ := masterRank.Add(masterRank.RPMin+int32(rp), MinimumExpForRanked)
			assert.Equal(t, masterRank.RPMin+int32(rp), newPoints)
			assert.Equal(t, proto.PlayerRank_MASTER, newRank.Rank)
		}
		{
			newRank, newPoints, _ := grandmasterRank.Add(grandmasterRank.RPMin+int32(rp), MinimumExpForRanked)
			assert.Equal(t, grandmasterRank.RPMin+int32(rp), newPoints)
			assert.Equal(t, proto.PlayerRank_GRANDWEAVER, newRank.Rank)
		}
	}
}

func TestRankDown(t *testing.T) {
	t.Parallel()

	// test ranks that can't rank down
	{
		masterRank := LookupRankByType(proto.PlayerRank_MASTER, proto.PlayerRankStage_STAGE_NONE)

		for rp := 1300; rp > 0; rp -= 100 {
			{
				newRank, newPoints, _ := masterRank.Add(int32(rp), MinimumExpForRanked)
				if int32(rp) < masterRank.RPMin {
					assert.Equal(t, masterRank.RPMin, newPoints)
				} else {
					assert.Equal(t, int32(rp), newPoints)
				}
				assert.Equal(t, proto.PlayerRank_MASTER, newRank.Rank)
			}
		}
	}

	// test ranks that can rank down
	{
		expertRank := LookupRankByType(proto.PlayerRank_EXPERT, proto.PlayerRankStage_STAGE_III)

		for rp := 1199; rp > 0; rp -= 100 {
			newRank, newPoints, _ := expertRank.Add(int32(rp), MinimumExpForRanked)

			switch {
			case rp < 1000:
				assert.Equal(t, proto.PlayerRank_EXPERT, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, newRank.Stage)
				if rp < 900 {
					assert.Equal(t, int32(900), newPoints)
				} else {
					assert.Equal(t, int32(rp), newPoints)
				}
			case rp < 1100:
				assert.Equal(t, proto.PlayerRank_EXPERT, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, newRank.Stage)
				assert.Equal(t, int32(rp), newPoints)
			case rp < 1200:
				assert.Equal(t, proto.PlayerRank_EXPERT, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, newRank.Stage)
				assert.Equal(t, int32(rp), newPoints)
			}

			expertRank = newRank
		}
	}

	{
		apprenticeRank := LookupRankByType(proto.PlayerRank_APPRENTICE, proto.PlayerRankStage_STAGE_III)

		for rp := 899; rp > 0; rp -= 100 {
			newRank, newPoints, _ := apprenticeRank.Add(int32(rp), MinimumExpForRanked)

			switch {
			case rp < 700:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_I, newRank.Stage)
				if rp < 600 {
					assert.Equal(t, int32(600), newPoints)
				} else {
					assert.Equal(t, int32(rp), newPoints)
				}
			case rp < 800:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_II, newRank.Stage)
				assert.Equal(t, int32(rp), newPoints)
			case rp < 900:
				assert.Equal(t, proto.PlayerRank_APPRENTICE, newRank.Rank)
				assert.Equal(t, proto.PlayerRankStage_STAGE_III, newRank.Stage)
				assert.Equal(t, int32(rp), newPoints)
			}

			apprenticeRank = newRank
		}
	}
}

func TestIsRankStageUp(t *testing.T) {
	t.Parallel()

	unranked := LookupRankByType(proto.PlayerRank_UNRANKED, proto.PlayerRankStage_STAGE_NONE)
	wandererI := LookupRankByType(proto.PlayerRank_WANDERER, proto.PlayerRankStage_STAGE_I)
	wandererII := LookupRankByType(proto.PlayerRank_WANDERER, proto.PlayerRankStage_STAGE_II)
	wandererIII := LookupRankByType(proto.PlayerRank_WANDERER, proto.PlayerRankStage_STAGE_III)

	traineeI := LookupRankByType(proto.PlayerRank_TRAINEE, proto.PlayerRankStage_STAGE_I)
	traineeII := LookupRankByType(proto.PlayerRank_TRAINEE, proto.PlayerRankStage_STAGE_II)
	traineeIII := LookupRankByType(proto.PlayerRank_TRAINEE, proto.PlayerRankStage_STAGE_III)

	apprenticeI := LookupRankByType(proto.PlayerRank_APPRENTICE, proto.PlayerRankStage_STAGE_I)
	apprenticeII := LookupRankByType(proto.PlayerRank_APPRENTICE, proto.PlayerRankStage_STAGE_II)
	apprenticeIII := LookupRankByType(proto.PlayerRank_APPRENTICE, proto.PlayerRankStage_STAGE_III)

	expertI := LookupRankByType(proto.PlayerRank_EXPERT, proto.PlayerRankStage_STAGE_I)
	expertII := LookupRankByType(proto.PlayerRank_EXPERT, proto.PlayerRankStage_STAGE_II)
	expertIII := LookupRankByType(proto.PlayerRank_EXPERT, proto.PlayerRankStage_STAGE_III)

	master := LookupRankByType(proto.PlayerRank_MASTER, proto.PlayerRankStage_STAGE_NONE)
	grandweaver := LookupRankByType(proto.PlayerRank_GRANDWEAVER, proto.PlayerRankStage_STAGE_NONE)

	assert.True(t, IsRankStageUp(wandererI, unranked))
	assert.True(t, IsRankStageUp(wandererII, wandererI))
	assert.True(t, IsRankStageUp(wandererIII, wandererII))
	assert.True(t, IsRankStageUp(traineeII, traineeI))
	assert.True(t, IsRankStageUp(apprenticeI, traineeI))
	assert.True(t, IsRankStageUp(apprenticeI, traineeIII))
	assert.True(t, IsRankStageUp(apprenticeI, unranked))
	assert.True(t, IsRankStageUp(apprenticeIII, apprenticeI))
	assert.True(t, IsRankStageUp(apprenticeIII, apprenticeII))
	assert.True(t, IsRankStageUp(expertIII, expertII))
	assert.True(t, IsRankStageUp(expertII, expertI))
	assert.True(t, IsRankStageUp(master, expertI))
	assert.True(t, IsRankStageUp(grandweaver, expertI))
	assert.True(t, IsRankStageUp(grandweaver, expertIII))
	assert.True(t, IsRankStageUp(grandweaver, master))

	assert.False(t, IsRankStageUp(wandererI, wandererI))
	assert.False(t, IsRankStageUp(unranked, wandererI))
	assert.False(t, IsRankStageUp(master, master))
	assert.False(t, IsRankStageUp(master, grandweaver))
}
