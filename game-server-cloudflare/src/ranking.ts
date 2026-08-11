import { PlayerRank, PlayerRankStage } from '@opensky/proto'

// Faithful TypeScript port of api/lib/ranking and api/lib/player_rank. Keep the
// source constants and operation order stable: persisted ratings must remain
// compatible with results produced by the Go service.

export type RankingOutcome = 0 | 0.5 | 1

export interface RankState {
  outcome?: RankingOutcome
  rating: number
  deviation: number
  points: number
}

export interface RankDefinition {
  rank: PlayerRank
  stage: PlayerRankStage
  minimumPoints: number
  minimumExperience: number
  hardFloor: boolean
  hardFloorValue: number
  softResetValue: number
  hardResetValue: number
  experienceReward: number
}

export const DEFAULT_RANK_POINTS = 0
export const DEFAULT_RATING = 1750
export const DEFAULT_DEVIATION = 350
export const MINIMUM_DEVIATION = 50
export const MINIMUM_EXPERIENCE_FOR_RANKED = 200

const MINIMUM_RATING = 1
const SCALE_RESOLUTION = 400
const Q = Math.log(10) / SCALE_RESOLUTION
const RANK_RANGE_MAX = 2500
const RANK_RANGE_MIN = 1250
const RANK_SOFT_MAX = 1000
const RANK_SOFT_MIN = 200
const RANK_BIAS_MAX = 20
const RANK_BIAS_MIN = 2
const RANK_FACTOR_MIN = 0.4
const RANK_DELTA_SCALE_MAX = 30
const RANK_TRANSFORM = 1250

export const PLAYER_RANKS: readonly RankDefinition[] = [
  {
    rank: PlayerRank.UNRANKED,
    stage: PlayerRankStage.STAGE_NONE,
    minimumPoints: 0,
    minimumExperience: 0,
    hardFloor: true,
    hardFloorValue: 0,
    softResetValue: 0,
    hardResetValue: 0,
    experienceReward: 0
  },
  {
    rank: PlayerRank.WANDERER,
    stage: PlayerRankStage.STAGE_I,
    minimumPoints: 0,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 0,
    softResetValue: 0,
    hardResetValue: 0,
    experienceReward: 0
  },
  {
    rank: PlayerRank.WANDERER,
    stage: PlayerRankStage.STAGE_II,
    minimumPoints: 100,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 100,
    softResetValue: 0,
    hardResetValue: 0,
    experienceReward: 100
  },
  {
    rank: PlayerRank.WANDERER,
    stage: PlayerRankStage.STAGE_III,
    minimumPoints: 200,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 200,
    softResetValue: 0,
    hardResetValue: 0,
    experienceReward: 100
  },
  {
    rank: PlayerRank.TRAINEE,
    stage: PlayerRankStage.STAGE_I,
    minimumPoints: 300,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 300,
    softResetValue: 0,
    hardResetValue: 300,
    experienceReward: 100
  },
  {
    rank: PlayerRank.TRAINEE,
    stage: PlayerRankStage.STAGE_II,
    minimumPoints: 400,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 400,
    softResetValue: 0,
    hardResetValue: 350,
    experienceReward: 100
  },
  {
    rank: PlayerRank.TRAINEE,
    stage: PlayerRankStage.STAGE_III,
    minimumPoints: 500,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 500,
    softResetValue: 0,
    hardResetValue: 400,
    experienceReward: 100
  },
  {
    rank: PlayerRank.APPRENTICE,
    stage: PlayerRankStage.STAGE_I,
    minimumPoints: 600,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 600,
    softResetValue: 0,
    hardResetValue: 600,
    experienceReward: 200
  },
  {
    rank: PlayerRank.APPRENTICE,
    stage: PlayerRankStage.STAGE_II,
    minimumPoints: 700,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: false,
    hardFloorValue: 0,
    softResetValue: 0,
    hardResetValue: 650,
    experienceReward: 100
  },
  {
    rank: PlayerRank.APPRENTICE,
    stage: PlayerRankStage.STAGE_III,
    minimumPoints: 800,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: false,
    hardFloorValue: 0,
    softResetValue: 750,
    hardResetValue: 700,
    experienceReward: 100
  },
  {
    rank: PlayerRank.EXPERT,
    stage: PlayerRankStage.STAGE_I,
    minimumPoints: 900,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 900,
    softResetValue: 0,
    hardResetValue: 750,
    experienceReward: 300
  },
  {
    rank: PlayerRank.EXPERT,
    stage: PlayerRankStage.STAGE_II,
    minimumPoints: 1000,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: false,
    hardFloorValue: 0,
    softResetValue: 0,
    hardResetValue: 800,
    experienceReward: 100
  },
  {
    rank: PlayerRank.EXPERT,
    stage: PlayerRankStage.STAGE_III,
    minimumPoints: 1100,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: false,
    hardFloorValue: 0,
    softResetValue: 0,
    hardResetValue: 850,
    experienceReward: 100
  },
  {
    rank: PlayerRank.MASTER,
    stage: PlayerRankStage.STAGE_NONE,
    minimumPoints: 1200,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: true,
    hardFloorValue: 1200,
    softResetValue: 1300,
    hardResetValue: 900,
    experienceReward: 400
  },
  {
    rank: PlayerRank.GRANDWEAVER,
    stage: PlayerRankStage.STAGE_NONE,
    minimumPoints: 1200,
    minimumExperience: MINIMUM_EXPERIENCE_FOR_RANKED,
    hardFloor: false,
    hardFloorValue: 1200,
    softResetValue: 1400,
    hardResetValue: 1000,
    experienceReward: 0
  }
]

export const initialRankState = (): RankState => ({
  rating: DEFAULT_RATING,
  deviation: DEFAULT_DEVIATION,
  points: DEFAULT_RANK_POINTS
})

const square = (value: number) => value ** 2

const deviationScale = (deviation: number) =>
  1 / Math.sqrt(1 + (3 * square(Q) * square(deviation)) / Math.PI)

const expectedOutcome = (
  rating: number,
  opponentRating: number,
  opponentDeviation: number
) => {
  const safeRating = Math.max(rating, MINIMUM_RATING)
  const safeOpponentRating = Math.max(opponentRating, MINIMUM_RATING)
  return (
    1 /
    (1 +
      10 **
        ((-deviationScale(opponentDeviation) *
          (safeRating - safeOpponentRating)) /
          SCALE_RESOLUTION))
  )
}

const deltaSquare = (
  rating: number,
  opponentRating: number,
  opponentDeviation: number
) => {
  const expectation = expectedOutcome(
    rating,
    opponentRating,
    opponentDeviation
  )
  return (
    1 /
    (square(Q) *
      square(deviationScale(opponentDeviation)) *
      expectation *
      (1 - expectation))
  )
}

const updateRating = (
  outcome: RankingOutcome,
  rating: number,
  deviation: number,
  opponentRating: number,
  opponentDeviation: number
) => {
  const safeRating = Math.max(rating, MINIMUM_RATING)
  const safeOpponentRating = Math.max(opponentRating, MINIMUM_RATING)
  const scale =
    (Q /
      (1 / square(deviation) +
        1 /
          deltaSquare(
            safeRating,
            safeOpponentRating,
            opponentDeviation
          ))) *
    deviationScale(opponentDeviation)
  return (
    safeRating +
    scale *
      (outcome -
        expectedOutcome(safeRating, safeOpponentRating, opponentDeviation))
  )
}

const updateDeviation = (
  rating: number,
  deviation: number,
  opponentRating: number,
  opponentDeviation: number
) =>
  Math.max(
    Math.sqrt(
      1 /
        (1 / square(deviation) +
          1 / deltaSquare(rating, opponentRating, opponentDeviation))
    ),
    MINIMUM_DEVIATION
  )

const rankFactor = (points: number) => {
  const rangeTransform = RANK_SOFT_MAX / (RANK_RANGE_MAX - RANK_RANGE_MIN)
  const rankDependence = Math.min(
    1,
    RANK_FACTOR_MIN +
      ((1 - RANK_FACTOR_MIN) * (points - RANK_SOFT_MIN)) /
        RANK_SOFT_MAX
  )
  return rangeTransform * rankDependence
}

const rankBias = (points: number) =>
  Math.max(
    RANK_BIAS_MIN,
    RANK_BIAS_MAX -
      ((points - RANK_SOFT_MIN) / RANK_SOFT_MAX) *
        (RANK_BIAS_MAX - RANK_BIAS_MIN)
  )

export const attenuateRankDelta = (delta: number) =>
  delta *
  (1 -
    (2 / Math.PI) *
      Math.atan(Math.abs(((2 / Math.PI) * delta) / RANK_DELTA_SCALE_MAX)))

const goRound = (value: number) =>
  value < 0 ? -Math.round(-value) : Math.round(value)

const updateRankPoints = (
  outcome: RankingOutcome,
  oldPoints: number,
  oldEstimatedRating: number,
  newEstimatedRating: number
) => {
  const ratingDelta = attenuateRankDelta(
    (newEstimatedRating - oldEstimatedRating) * rankFactor(oldPoints)
  )
  return goRound(oldPoints + ratingDelta + outcome * rankBias(oldPoints))
}

export const updateRankState = (
  outcome: RankingOutcome,
  state: RankState,
  opponent: RankState
): RankState => {
  const estimatedRating = state.points + RANK_TRANSFORM
  const opponentEstimatedRating = opponent.points + RANK_TRANSFORM
  const newEstimatedRating = updateRating(
    outcome,
    estimatedRating,
    state.deviation,
    opponentEstimatedRating,
    opponent.deviation
  )
  const points = updateRankPoints(
    outcome,
    state.points,
    estimatedRating,
    newEstimatedRating
  )
  if (points < 0) return initialRankState()
  return {
    outcome,
    rating: updateRating(
      outcome,
      state.rating,
      state.deviation,
      opponent.rating,
      opponent.deviation
    ),
    deviation: updateDeviation(
      state.rating,
      state.deviation,
      opponent.rating,
      opponent.deviation
    ),
    points
  }
}

export const lookupRankByScoreAndExperience = (
  points: number,
  experience: number
): RankDefinition => {
  for (let index = PLAYER_RANKS.length - 1; index >= 0; index -= 1) {
    const rank = PLAYER_RANKS[index]
    if (rank.rank === PlayerRank.GRANDWEAVER) continue
    if (
      points >= rank.minimumPoints &&
      experience >= rank.minimumExperience
    ) {
      return rank
    }
  }
  if (experience >= MINIMUM_EXPERIENCE_FOR_RANKED) return PLAYER_RANKS[1]
  return PLAYER_RANKS[0]
}

export const lookupRankByScore = (points: number) =>
  lookupRankByScoreAndExperience(points, MINIMUM_EXPERIENCE_FOR_RANKED)

export const nextRankPoints = (rank: RankDefinition) => {
  const index = PLAYER_RANKS.indexOf(rank)
  if (rank.rank === PlayerRank.MASTER || index < 0) return rank.minimumPoints
  return PLAYER_RANKS[Math.min(index + 1, PLAYER_RANKS.length - 1)]
    .minimumPoints
}

export const rankStageIncreased = (
  next: RankDefinition,
  previous: RankDefinition
) => {
  const rankOrder = [
    PlayerRank.UNKNOWN,
    PlayerRank.UNRANKED,
    PlayerRank.WANDERER,
    PlayerRank.TRAINEE,
    PlayerRank.APPRENTICE,
    PlayerRank.EXPERT,
    PlayerRank.MASTER,
    PlayerRank.GRANDWEAVER
  ]
  const stageOrder = [
    PlayerRankStage.STAGE_NONE,
    PlayerRankStage.STAGE_I,
    PlayerRankStage.STAGE_II,
    PlayerRankStage.STAGE_III
  ]
  const nextRank = rankOrder.indexOf(next.rank)
  const previousRank = rankOrder.indexOf(previous.rank)
  return (
    nextRank > previousRank ||
    (nextRank === previousRank &&
      stageOrder.indexOf(next.stage) > stageOrder.indexOf(previous.stage))
  )
}

export const applySourceRankProtections = (
  current: RankDefinition,
  currentState: RankState,
  nextState: RankState
): { state: RankState; rank: RankDefinition } => {
  const belowApprentice = [
    PlayerRank.UNRANKED,
    PlayerRank.WANDERER,
    PlayerRank.TRAINEE
  ].includes(current.rank)
  const protectedState = {
    ...nextState,
    ...(belowApprentice
      ? {
          points: Math.max(currentState.points, nextState.points),
          deviation: DEFAULT_DEVIATION
        }
      : {})
  }
  const candidate = lookupRankByScore(protectedState.points)
  if (current.hardFloor && protectedState.points < current.hardFloorValue) {
    return {
      state: { ...protectedState, points: current.hardFloorValue },
      rank: current
    }
  }
  return { state: protectedState, rank: candidate }
}

export const serializeRankState = (state: RankState) =>
  JSON.stringify([
    state.outcome ?? -1,
    state.rating,
    state.deviation,
    state.points
  ])

export const parseRankState = (
  value: string,
  fallbackPoints = 0
): RankState => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.length === 4 &&
      [-1, 0, 0.5, 1].includes(parsed[0]) &&
      parsed.slice(1).every(Number.isFinite)
    ) {
      return {
        ...(parsed[0] === -1
          ? {}
          : { outcome: parsed[0] as RankingOutcome }),
        rating: parsed[1] as number,
        deviation: parsed[2] as number,
        points: Math.trunc(parsed[3] as number)
      }
    }
  } catch {
    // Older Cloud Weasel rows predate rank-state persistence. Reconstruct the
    // closest source-compatible state from their public score.
  }
  return {
    rating: fallbackPoints + RANK_TRANSFORM,
    deviation: DEFAULT_DEVIATION,
    points: fallbackPoints
  }
}
