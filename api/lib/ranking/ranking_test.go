package ranking

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

const deltaTolerance = 0.00001

type testCaseIn struct {
	Win        Outcome
	Rating_Old float64
	RD_Old     float64
	Rank_Old   int32
	Rating_Opp float64
	RD_Opp     float64
	Rank_Opp   int32
}

type testCaseOut struct {
	Rating_New float64
	RD_New     float64
	Rank_New   int32
}

var inCases = []testCaseIn{
	{Win, 1250, 350, 200, 1250, 350, 200},
	{Win, 2000, 100, 600, 1750, 100, 400},
	{Win, 2200, 200, 1000, 2400, 100, 1200},
	{Win, 2750, 100, 1200, 2755, 100, 1205},
	{Win, 2900, 100, 1250, 2950, 100, 1250},
	{Win, 2300, 100, 1000, 1400, 100, 1100},
	{Loss, 1250, 350, 300, 1250, 350, 300},
	{Loss, 2000, 100, 600, 1750, 100, 400},
	{Loss, 2200, 200, 1000, 2400, 100, 1200},
	{Loss, 2750, 100, 1200, 2755, 100, 1205},
	{Loss, 2900, 100, 1250, 2950, 100, 1250},
	{Loss, 2300, 100, 1000, 1400, 100, 1100},
	{Draw, 1250, 350, 300, 1250, 350, 300},
	{Draw, 2200, 200, 1000, 2400, 100, 1200},
	{Draw, 2900, 100, 1250, 2950, 100, 1250},
	{Win, 1500, 350, 200, 1500, 250, 200},
	{Win, 1000, 100, 200, 1600, 350, 600},
	{Win, 1000, 350, 200, 1600, 100, 600},
	{Win, 2000, 100, 1300, 2600, 137, 1600},
	{Win, 2000, 100, 1300, 2600, 350, 1600},
	{Win, 2000, 350, 1300, 2600, 100, 1600},
}

var outCases = []testCaseOut{
	{1382.16273136436, 318.430420961991, 243},
	{2010.67209296261, 97.8948961277282, 619},
	{2322.61367558107, 182.753342166943, 1033},
	{2773.89676015618, 96.9951117625091, 1216},
	{2926.56977838943, 97.039392304661, 1266},
	{2300.54142493833, 99.865559053693, 1021},
	{1117.83726863564, 318.430420961991, 276},
	{1962.59078251652, 97.8948961277282, 586},
	{2155.04730929987, 182.753342166943, 980},
	{2726.6952502247, 96.9951117625091, 1186},
	{2879.32516142906, 97.039392304661, 1236},
	{2250.50483882682, 99.865559053693, 990},
	{1250, 318.430420961991, 309},
	{2238.83049244047, 182.753342166943, 1021},
	{2902.94746990924, 97.039392304661, 1251},
	{1652.38954052961, 302.26325821035, 244},
	{1021.3491368382, 99.5172652549113, 226},
	{1514.70083322362, 328.09118124, 249},
	{2042.3158735393, 99.4107830289981, 1320},
	{2021.3491368382, 99.5172652549113, 1313},
	{2514.70083322362, 328.09118124, 1332},
}

func TestPostMatchUpdateAgainstTable(t *testing.T) {
	for i, in := range inCases {
		playerState := State{Win: in.Win, R: in.Rating_Old, RD: in.RD_Old, RP: in.Rank_Old}
		oppState := State{Win: in.Win, R: in.Rating_Opp, RD: in.RD_Opp, RP: in.Rank_Opp}
		newState, err := UpdateRankState(in.Win, &playerState, &oppState)
		assert.NoError(t, err)
		assert.InDelta(t, outCases[i].Rating_New, newState.R, deltaTolerance, "failed case %v (Rating_New)", i)
		assert.InDelta(t, outCases[i].RD_New, newState.RD, deltaTolerance, "failed case %v (RD_New)", i)
		assert.InDelta(t, outCases[i].Rank_New, newState.RP, deltaTolerance, "failed case %v (Rank_New)", i)
	}
}

func TestInitialRankState(t *testing.T) {
	state := InitialRankState()

	assert.NotNil(t, state)
	assert.Equal(t, OutcomeUndefined, state.Win, "win should be not defined")
	assert.Equal(t, 1750.0, state.R, "wrong value for default rating")
	assert.Equal(t, 350.0, state.RD, "wrong value for default RD")
}

func TestUpdateAfterInitialRankState(t *testing.T) {
	p1 := InitialRankState()
	p2 := InitialRankState()

	p1a, err := UpdateRankState(Win, p1, p2)
	assert.NoError(t, err)

	p2a, err := UpdateRankState(Loss, p2, p1)
	assert.NoError(t, err)

	// TODO: get numbers from a static table

	t.Logf("p1a: %s", p1a)
	t.Logf("p2a: %s", p2a)
}

func TestNonNegativeRankPoints(t *testing.T) {
	p1 := InitialRankState()
	p2 := InitialRankState()

	for i := 0; i < 100; i++ {
		p1a, err := UpdateRankState(Win, p1, p2)
		assert.NoError(t, err)

		p2a, err := UpdateRankState(Loss, p2, p1)
		assert.NoError(t, err)

		p1, p2 = p1a, p2a

		assert.GreaterOrEqual(t, p1.RP, int32(0))
		assert.GreaterOrEqual(t, p2.RP, int32(0))

		assert.GreaterOrEqual(t, p1.RD, DefaultGlicko_RDMin)
		assert.GreaterOrEqual(t, p2.RD, DefaultGlicko_RDMin)
	}
}

func TestAttenuatedDeltaRank(t *testing.T) {
	rk := NewRank()

	testCases := [][2]float64{
		{5, 4.66352163365388},
		{10, 8.66879849247931},
		{15, 12.0572021414312},
		{20, 14.8895538507132},
		{30, 19.1727878031568},
		{40, 22.0775666241213},
		{50, 24.0576707262059},
		{60, 25.4306839914817},
		{100, 28.0351524454087},
		{200, 29.462624235818},
		{300, 29.7568495631998},
		{400, 29.8623531340721},
		{500, 29.9116439855198},
		{600, 29.9385422739343},
		{700, 29.9548032224729},
		{800, 29.9653742298333},
		{900, 29.9726294408973},
		{1000, 29.9778229312576},
	}

	for i := range testCases {
		attenuatedDeltaRank := rk.attenuateDeltaRank(testCases[i][0])
		assert.InDelta(t, testCases[i][1], attenuatedDeltaRank, deltaTolerance, "failed test case %v", i)
	}
}
