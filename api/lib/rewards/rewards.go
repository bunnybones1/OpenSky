package rewards

import "math"

var (
	// https://docs.google.com/spreadsheets/d/1sJAXd6enn1JWY6AYu8Ob6CQk1vOcab-BA8GTdVp7Jh0/edit#gid=1324060701
	// April 26 2022 version
	base        = float64(1.7)
	numerator   = float64(120)
	denominator = float64(26)

	rankSilverRewards        map[uint]uint
	rankTicketRewards        map[uint]uint
	rewardedRanksCount       uint = 500
	rewardedSilverRanksCount uint = 100
)

func SilverRewards() map[uint]uint {
	return rankSilverRewards
}

func TicketRewards() map[uint]uint {
	return rankTicketRewards
}

func RewardedRanksCount() uint {
	return rewardedRanksCount
}

// calculate once - this doesn't change
func init() {

	// Silver card rewards
	rankSilverRewards = map[uint]uint{}
	for i := uint(1); i <= rewardedRanksCount; i++ {
		if i <= rewardedSilverRanksCount {
			// Floor of base^(numerator / (denominator + rank))
			rankSilverRewards[i] = uint(math.Floor(math.Pow(base, numerator/(float64(i)+denominator))))
		} else {
			rankSilverRewards[i] = 0
		}
	}

	// Conquest ticket rewards
	rankTicketRewards = map[uint]uint{}
	for i := uint(1); i <= rewardedRanksCount; i++ {
		switch {
		case i >= 1 && i <= 100:
			rankTicketRewards[i] = 2

		case i >= 101 && i <= 250:
			rankTicketRewards[i] = 1
		}
	}

}
