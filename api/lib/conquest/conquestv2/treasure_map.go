package conquestv2

type treasureLevel uint16

const conquestPointsCap uint64 = 13750

// Map with levels and their total points required.
var treasureLevelToTotalPointsMap = map[treasureLevel]uint64{
	0:  0,
	1:  250,
	2:  750,
	3:  1500,
	4:  2500,
	5:  3750,
	6:  5250,
	7:  7000,
	8:  9000,
	9:  11250,
	10: conquestPointsCap,
}

// Map with levels and their total weight.
var treasureLevelToTotalWeightMap = map[treasureLevel]float32{
	1:  1,
	2:  3.19,
	3:  6.9,
	4:  12.65,
	5:  21.32,
	6:  34.29,
	7:  53.99,
	8:  84.67,
	9:  134.32,
	10: 218.69,
}
