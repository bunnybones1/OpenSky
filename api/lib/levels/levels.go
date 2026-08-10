package levels // TODO: find a new name for this package, its not clear enough

const (
	START_LEVEL = uint16(0)
	MAX_LEVEL   = uint16(1000)

	xpPerLevel uint64 = 200
)

var (
	expToNextLevel = make([]uint64, MAX_LEVEL+1)
)

func init() {
	// Level up requirement always linear at 100XP = 1 level up
	for level := START_LEVEL; level <= MAX_LEVEL; level++ {
		expToNextLevel[level] = xpPerLevel
	}
}

// LevelUpXP takes level, returns XP required to reach next level
func LevelUpXP(lvl uint16) uint64 {
	if lvl > MAX_LEVEL {
		lvl = MAX_LEVEL
	}
	if lvl < START_LEVEL {
		lvl = START_LEVEL
	}
	return expToNextLevel[lvl]
}

// TotalExperience returns the total experience of the player
func TotalExperience(lvl uint16, exp uint64) uint64 {
	for i := START_LEVEL; i < lvl && i <= MAX_LEVEL; i++ {
		exp += expToNextLevel[i]
	}
	return exp
}

// LevelUp takes current level, experience gained since leveling up and returns new level and experience left
func LevelUp(lvl uint16, exp uint64) (uint16, uint64) {
	for {
		next := LevelUpXP(lvl)
		if exp < next {
			break
		}

		exp = exp - next
		lvl++
	}

	return lvl, exp
}
