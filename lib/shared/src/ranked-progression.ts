export const EXPERIENCE_PER_LEVEL = 200
export const MINIMUM_EXPERIENCE_FOR_RANKED = 200
export const INITIAL_RANK_STATE_JSON = '[-1,1750,350,0]'

export const totalPlayerExperience = (level: number, experience: number) =>
  Math.max(0, Math.trunc(level) - 1) * EXPERIENCE_PER_LEVEL +
  Math.max(0, Math.trunc(experience))

export const hasUnlockedRanked = (level: number, experience: number) =>
  totalPlayerExperience(level, experience) >= MINIMUM_EXPERIENCE_FOR_RANKED
