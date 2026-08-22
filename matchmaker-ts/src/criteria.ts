import { GameMode, PlayerRank } from '@opensky/proto'

import {
  compareRanks,
  currentConquestWins,
  isBot,
  isChallengeMatch,
  isConquestMatch,
  isPracticePvpMatch,
  isRankedMatch,
  matchmakingScore,
  MatchmakerPlayer,
  waitTimeMs
} from './model'

export type MatchValidator = (
  player1: MatchmakerPlayer,
  player2: MatchmakerPlayer
) => boolean

export type GameModeCriteria = MatchValidator

export const sessionValidator: MatchValidator = (player1, player2) =>
  player1.sessionId === player2.sessionId

export const versionValidator: MatchValidator = (player1, player2) =>
  player1.clientVersionHash === player2.clientVersionHash

export const challengeCriteria: GameModeCriteria = (player1, player2) =>
  (isChallengeMatch(player1) || isChallengeMatch(player2)) &&
  player1.mode === player2.mode &&
  player1.sessionId.length > 0 &&
  player2.sessionId.length > 0 &&
  player1.sessionId === player2.sessionId

export const sameIpAddressValidator = (
  allowSameIpMatch: boolean,
  challenge: GameModeCriteria = challengeCriteria
): MatchValidator =>
  (player1, player2) =>
    allowSameIpMatch ||
    player1.ipAddress !== player2.ipAddress ||
    challenge(player1, player2)

export interface RelaxMatchingRuleIntervals {
  defaultMs: number
  rankedConstructedMs: number
  rankedDiscoveryMs: number
  conquestConstructedMs: number
  conquestDiscoveryMs: number
}

export class WaitTimeScoreCalculator {
  constructor(
    private readonly intervals: RelaxMatchingRuleIntervals,
    private readonly rules: number[],
    private readonly now: () => number = Date.now
  ) {
    if (rules.length === 0) throw new Error('at least one matching rule is required')
  }

  calculate(player: MatchmakerPlayer): number {
    const interval = this.intervalFor(player.mode)
    const wait = waitTimeMs(player, this.now())
    for (let index = 0; index < this.rules.length - 1; index += 1) {
      if (wait >= index * interval && wait < (index + 1) * interval) {
        return this.rules[index]
      }
    }
    return this.rules[this.rules.length - 1]
  }

  private intervalFor(mode: GameMode): number {
    switch (mode) {
      case GameMode.CONQUEST_DISCOVERY:
        return this.intervals.conquestDiscoveryMs
      case GameMode.CONQUEST_CONSTRUCTED:
        return this.intervals.conquestConstructedMs
      case GameMode.RANKED_DISCOVERY:
        return this.intervals.rankedDiscoveryMs
      case GameMode.RANKED_CONSTRUCTED:
        return this.intervals.rankedConstructedMs
      default:
        return this.intervals.defaultMs
    }
  }
}

export const rankedCriteria = (
  waitTimeScore: WaitTimeScoreCalculator
): GameModeCriteria =>
  (player1, player2) => {
    if (!isRankedMatch(player1) && !isRankedMatch(player2)) return false
    if (player1.mode !== player2.mode) return false
    const distance = Math.abs(matchmakingScore(player1) - matchmakingScore(player2))
    const allowed = Math.min(
      waitTimeScore.calculate(player1),
      waitTimeScore.calculate(player2)
    )
    return distance <= allowed
  }

export const practicePvpCriteria = (
  waitTimeScore: WaitTimeScoreCalculator
): GameModeCriteria =>
  (player1, player2) => {
    if (!isPracticePvpMatch(player1) && !isPracticePvpMatch(player2)) return false
    const versusRanked =
      player1.mode === GameMode.RANKED_CONSTRUCTED ||
      player2.mode === GameMode.RANKED_CONSTRUCTED
    if (player1.mode !== player2.mode && !versusRanked) return false
    if (
      player1.mode === GameMode.RANKED_CONSTRUCTED &&
      compareRanks(player1.rank, PlayerRank.EXPERT) >= 0
    ) {
      return false
    }
    if (
      player2.mode === GameMode.RANKED_CONSTRUCTED &&
      compareRanks(player2.rank, PlayerRank.EXPERT) >= 0
    ) {
      return false
    }
    const distance = Math.abs(matchmakingScore(player1) - matchmakingScore(player2))
    const allowed = Math.min(
      waitTimeScore.calculate(player1),
      waitTimeScore.calculate(player2)
    )
    return distance <= allowed
  }

export const conquestCriteria = (
  strictConquestMatching: boolean,
  waitTimeWinsScore: WaitTimeScoreCalculator,
  waitTimeEloScore: WaitTimeScoreCalculator
): GameModeCriteria =>
  (player1, player2) => {
    if (!isConquestMatch(player1) && !isConquestMatch(player2)) return false
    if (player1.mode !== player2.mode) return false

    const winsDistance = Math.abs(
      currentConquestWins(player1) - currentConquestWins(player2)
    )
    const allowedWinsDistance = strictConquestMatching
      ? 0
      : Math.min(
          waitTimeWinsScore.calculate(player1),
          waitTimeWinsScore.calculate(player2)
        )
    if (winsDistance > allowedWinsDistance) return false

    const player1Elo = matchmakingScore(player1) > 0 ? 0 : matchmakingScore(player1)
    const player2Elo = matchmakingScore(player2) > 0 ? 0 : matchmakingScore(player2)
    const eloDistance = Math.abs(player1Elo - player2Elo)
    const allowedEloDistance = Math.max(
      waitTimeEloScore.calculate(player1),
      waitTimeEloScore.calculate(player2)
    )
    return eloDistance <= allowedEloDistance
  }

export const gameModeCriteriaValidator = (
  ...criteria: GameModeCriteria[]
): MatchValidator =>
  (player1, player2) =>
    criteria.some((current) => current(player1, player2))

export const botMatchValidator = (
  bypassWaitTimeChecks: boolean,
  now: () => number = Date.now
): MatchValidator =>
  (player1, player2) => {
    if (bypassWaitTimeChecks) return true
    const player = isBot(player1) ? player2 : player1
    if (compareRanks(player.rank, PlayerRank.APPRENTICE) > 0) return false
    if (player.lostLastMatch) return true
    const wait = waitTimeMs(player, now())
    if (player.rank === PlayerRank.TRAINEE) return wait >= 20_000
    if (player.rank === PlayerRank.APPRENTICE) return wait >= 30_000
    return wait >= 10_000
  }
