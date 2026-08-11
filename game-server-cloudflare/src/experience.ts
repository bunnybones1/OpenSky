import {
  GameMode,
  MatchStatus,
  Reward,
  RewardExpReason,
  RewardType
} from '@opensky/proto'

export const MATCH_PLAYED_XP = 30
export const MATCH_RESULT_XP = 20
export const MINIMUM_HEROES_FOR_MATCH_XP = 3
export const MINIMUM_TURN_FOR_LOSER_XP = 6
export const EXPERIENCE_PER_LEVEL = 200

export interface MatchExperiencePlayer {
  accountID: number
  principal: string
  gameMode: GameMode
  level: number
  experience: number
  seasonLevel: number
  heroCount: number
}

export interface MatchExperienceInput {
  players: [
    MatchExperiencePlayer | undefined,
    MatchExperiencePlayer | undefined
  ]
  winner: 0 | 1 | undefined
  status: MatchStatus
  turnCount: number
  multiplier?: number
}

const PRACTICE_MODES = new Set<GameMode>([
  GameMode.PRACTICE_PVP,
  GameMode.PRACTICE_BOT,
  GameMode.WARM_UP
])

const CHALLENGE_MODES = new Set<GameMode>([
  GameMode.CHALLENGE_CONSTRUCTED,
  GameMode.CHALLENGE_DISCOVERY
])

/** Exact temporary A/B cutoff from api/lib/levels/xp/awarder.go. */
export const practiceExperienceCutoffLevel = (principal: string): number =>
  principal.length < 3 || principal[2].toLowerCase() < '8' ? 15 : 35

export const experienceReward = (
  player: MatchExperiencePlayer,
  amount: number,
  reason: RewardExpReason
): Reward => ({
  accountID: player.accountID,
  type: RewardType.EXP,
  exp: {
    amount,
    reason,
    currentLevel: player.seasonLevel,
    requiredExp: EXPERIENCE_PER_LEVEL,
    beforeMatchExp: player.experience
  }
})

/**
 * Faithful TypeScript port of the source match XP awarder. This function is
 * deliberately pure so the source edge cases remain independently testable.
 */
export const awardMatchExperience = (
  input: MatchExperienceInput
): [Reward[], Reward[]] => {
  const rewards: [Reward[], Reward[]] = [[], []]
  const matchIsPractice = input.players.some(
    player => player && PRACTICE_MODES.has(player.gameMode)
  )
  const matchIsChallenge = input.players.every(
    player => !player || CHALLENGE_MODES.has(player.gameMode)
  )
  const loserIsEligible =
    ![MatchStatus.FORFEITED, MatchStatus.ABANDONED].includes(input.status) ||
    input.turnCount >= MINIMUM_TURN_FOR_LOSER_XP
  const isDraw = input.winner === undefined

  for (const index of [0, 1] as const) {
    const player = input.players[index]
    if (!player) continue

    let multiplier = input.multiplier ?? 1
    const cutoff = practiceExperienceCutoffLevel(player.principal)
    if (
      matchIsPractice &&
      PRACTICE_MODES.has(player.gameMode) &&
      player.level >= cutoff
    ) {
      multiplier = 0
    } else if (matchIsChallenge && player.level >= cutoff) {
      multiplier = 0
    }
    if (multiplier <= 0) continue
    if (player.heroCount < MINIMUM_HEROES_FOR_MATCH_XP) continue

    const isWinner = input.winner === index
    if (isWinner || loserIsEligible) {
      rewards[index].push(
        experienceReward(
          player,
          Math.ceil(MATCH_PLAYED_XP * multiplier),
          RewardExpReason.MatchPlayed
        )
      )
    }
    if (isDraw) {
      rewards[index].push(
        experienceReward(
          player,
          Math.ceil(MATCH_RESULT_XP * multiplier),
          RewardExpReason.Draw
        )
      )
    } else if (isWinner && (!matchIsChallenge || player.level < cutoff)) {
      rewards[index].push(
        experienceReward(
          player,
          Math.ceil(MATCH_RESULT_XP * multiplier),
          RewardExpReason.Victory
        )
      )
    }
  }

  return rewards
}

export const addExperience = (
  level: number,
  experience: number,
  gain: number
) => {
  let nextLevel = level
  let nextExperience = experience + gain
  while (nextExperience >= EXPERIENCE_PER_LEVEL) {
    nextExperience -= EXPERIENCE_PER_LEVEL
    nextLevel += 1
  }
  return { level: nextLevel, experience: nextExperience }
}
