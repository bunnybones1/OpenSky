import { GameMode, PlayerRank } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  botMatchValidator,
  challengeCriteria,
  conquestCriteria,
  createBotPlayer,
  createPlayer,
  practicePvpCriteria,
  rankedCriteria,
  sameIpAddressValidator,
  sessionValidator,
  versionValidator,
  WaitTimeScoreCalculator
} from '../src'

const now = 1_000_000
const intervals = {
  defaultMs: 1_000,
  rankedConstructedMs: 11_000,
  rankedDiscoveryMs: 12_000,
  conquestConstructedMs: 21_000,
  conquestDiscoveryMs: 22_000
}

describe('Go match criteria compatibility', () => {
  it('preserves session, version, challenge, and same-IP rules', () => {
    const player1 = createPlayer({
      address: '0x01',
      mode: GameMode.CHALLENGE_CONSTRUCTED,
      sessionId: 'code',
      clientVersionHash: 'v1',
      ipAddress: 'same'
    })
    const player2 = createPlayer({
      address: '0x02',
      mode: GameMode.CHALLENGE_CONSTRUCTED,
      sessionId: 'code',
      clientVersionHash: 'v1',
      ipAddress: 'same'
    })
    expect(sessionValidator(player1, player2)).toBe(true)
    expect(versionValidator(player1, player2)).toBe(true)
    expect(challengeCriteria(player1, player2)).toBe(true)
    expect(sameIpAddressValidator(false)(player1, player2)).toBe(true)

    player2.sessionId = 'other'
    expect(sessionValidator(player1, player2)).toBe(false)
    expect(challengeCriteria(player1, player2)).toBe(false)
    expect(sameIpAddressValidator(false)(player1, player2)).toBe(false)
  })

  it('selects wait-time relaxation stages by game mode', () => {
    const calculator = new WaitTimeScoreCalculator(intervals, [10, 20, 30], () => now)
    const fixture = (mode: GameMode, waitMs: number) =>
      createPlayer({ address: `0x${mode}${waitMs}`, mode, initTimestampMs: now - waitMs })

    expect(calculator.calculate(fixture(GameMode.RANKED_CONSTRUCTED, 10_000))).toBe(10)
    expect(calculator.calculate(fixture(GameMode.RANKED_CONSTRUCTED, 11_000))).toBe(20)
    expect(calculator.calculate(fixture(GameMode.RANKED_DISCOVERY, 24_000))).toBe(30)
    expect(calculator.calculate(fixture(GameMode.CONQUEST_CONSTRUCTED, 21_000))).toBe(20)
    expect(calculator.calculate(fixture(GameMode.CONQUEST_DISCOVERY, 44_000))).toBe(30)
    expect(calculator.calculate(fixture(GameMode.PRACTICE_PVP, 1_000))).toBe(20)
  })

  it('preserves ranked and practice-PVP distance rules', () => {
    const calculator = new WaitTimeScoreCalculator(intervals, [8, 20], () => now)
    const ranked = rankedCriteria(calculator)
    const practice = practicePvpCriteria(calculator)
    const player1 = createPlayer({
      address: '0x01',
      mode: GameMode.RANKED_CONSTRUCTED,
      score: 2,
      initTimestampMs: now
    })
    const player2 = createPlayer({
      address: '0x02',
      mode: GameMode.RANKED_CONSTRUCTED,
      score: 10,
      initTimestampMs: now
    })
    expect(ranked(player1, player2)).toBe(true)
    player2.score = 11
    expect(ranked(player1, player2)).toBe(false)

    player1.mode = GameMode.PRACTICE_PVP
    player2.score = 10
    player2.rank = PlayerRank.APPRENTICE
    expect(practice(player1, player2)).toBe(true)
    player2.rank = PlayerRank.EXPERT
    expect(practice(player1, player2)).toBe(false)
  })

  it('preserves conquest win and non-positive Elo matching', () => {
    const wins = new WaitTimeScoreCalculator(intervals, [1], () => now)
    const elo = new WaitTimeScoreCalculator(intervals, [50], () => now)
    const relaxed = conquestCriteria(false, wins, elo)
    const strict = conquestCriteria(true, wins, elo)
    const player1 = createPlayer({
      address: '0x01',
      mode: GameMode.CONQUEST_CONSTRUCTED,
      conquestProgress: ['WIN'],
      score: -20
    })
    const player2 = createPlayer({
      address: '0x02',
      mode: GameMode.CONQUEST_CONSTRUCTED,
      conquestProgress: ['WIN', 'WIN'],
      score: 500
    })
    expect(relaxed(player1, player2)).toBe(true)
    expect(strict(player1, player2)).toBe(false)
  })

  it('preserves bot rank, loss, and queue-wait thresholds', () => {
    const validate = botMatchValidator(false, () => now)
    const bot = createBotPlayer(GameMode.RANKED_CONSTRUCTED)
    const player = createPlayer({
      address: '0x01',
      rank: PlayerRank.TRAINEE,
      initTimestampMs: now - 19_999
    })
    expect(validate(bot, player)).toBe(false)
    player.initTimestampMs = now - 20_000
    expect(validate(bot, player)).toBe(true)
    player.rank = PlayerRank.EXPERT
    player.lostLastMatch = true
    expect(validate(bot, player)).toBe(false)
  })
})
