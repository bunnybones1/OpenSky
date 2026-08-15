import { NotificationType, PlayerRank, PlayerRankStage } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceNotificationOneTimeWire,
  sourceNotificationWire,
  sourceNullableNotificationListWire,
  sourceNullableNotificationOneTimeListWire
} from '../src/notification-wire'

describe('source notification JSON wire', () => {
  it('emits the required enum and complete leaderboard reward contract', () => {
    expect(
      sourceNotificationWire({
        id: 12,
        type: NotificationType.LEADERBOARD_REWARD,
        leaderboardReward: {
          season: 62,
          week: 2,
          silverCardAmounts: { 65539: 2 },
          ticketAmount: 1,
          earnedConstructedPlayerRanks: [
            {
              playerRank: PlayerRank.MASTER,
              playerRankStage: PlayerRankStage.STAGE_I
            }
          ],
          earnedDiscoveryPlayerRanks: [],
          rankedConstructedRank: 9,
          rankedDiscoveryRank: 0
        },
        oneTime: { id: 99, name: 'must not leak' }
      })
    ).toEqual({
      id: 12,
      type: 'LEADERBOARD_REWARD',
      leaderboardReward: {
        season: 62,
        week: 2,
        silverCardAmounts: { 65539: 2 },
        ticketAmount: 1,
        earnedConstructedPlayerRanks: [
          { playerRank: 'MASTER', playerRankStage: 'STAGE_I' }
        ],
        earnedDiscoveryPlayerRanks: [],
        rankedConstructedRank: 9,
        rankedDiscoveryRank: 0
      }
    })
  })

  it('preserves required null maps, slices, and nested enum pointers', () => {
    expect(
      sourceNotificationWire({
        id: 13,
        type: NotificationType.LEADERBOARD_REWARD,
        leaderboardReward: {
          earnedConstructedPlayerRanks: [{}]
        }
      })
    ).toEqual({
      id: 13,
      type: 'LEADERBOARD_REWARD',
      leaderboardReward: {
        season: 0,
        week: 0,
        silverCardAmounts: null,
        ticketAmount: 0,
        earnedConstructedPlayerRanks: [
          { playerRank: null, playerRankStage: null }
        ],
        earnedDiscoveryPlayerRanks: null,
        rankedConstructedRank: 0,
        rankedDiscoveryRank: 0
      }
    })
  })

  it('normalizes conquest, one-time, season-start, and marker variants', () => {
    expect(
      sourceNotificationWire({
        id: 14,
        type: NotificationType.CONQUEST_V2_REWARD,
        conquestV2Reward: { season: 62, week: 3 }
      })
    ).toEqual({
      id: 14,
      type: 'CONQUEST_V2_REWARD',
      conquestV2Reward: {
        season: 62,
        week: 3,
        treasureLevel: 0,
        amountUSDC: 0,
        silverCardAmounts: null
      }
    })
    expect(
      sourceNotificationWire({
        id: 15,
        type: NotificationType.ONE_TIME,
        oneTime: { id: 8, name: 'Hello' }
      })
    ).toEqual({
      id: 15,
      type: 'ONE_TIME',
      oneTime: { id: 8, name: 'Hello' }
    })
    expect(
      sourceNotificationWire({
        id: 16,
        type: NotificationType.SEASON_START
      })
    ).toEqual({
      id: 16,
      type: 'SEASON_START',
      seasonStart: { seasonNumber: 0, seasonName: '' }
    })
    expect(
      sourceNotificationWire({
        id: 17,
        type: NotificationType.SKYPASS_LEVEL_INTRODUCTION
      })
    ).toEqual({ id: 17, type: 'SKYPASS_LEVEL_INTRODUCTION' })
  })

  it('preserves the source nil list and required nullable discriminator', () => {
    expect(sourceNullableNotificationListWire([])).toBeNull()
    expect(sourceNotificationWire({ id: 18, type: null })).toEqual({
      id: 18,
      type: null
    })
  })

  it('preserves staff template pointer omission and required timestamps', () => {
    expect(sourceNotificationOneTimeWire({ id: 5, name: 'Template' })).toEqual({
      id: 5,
      name: 'Template',
      createdAt: null,
      updatedAt: null,
      updatedBy: null
    })
    expect(
      sourceNotificationOneTimeWire({
        id: 6,
        name: 'Full',
        data: { title: 'Hello' },
        filter: { age: [{ '>': '1h' }] },
        createdAt: '2026-08-15T00:00:00.000Z',
        validFrom: '2026-08-15T01:00:00.000Z',
        expiresAt: '2026-08-16T01:00:00.000Z',
        updatedAt: '2026-08-15T02:00:00.000Z',
        updatedBy: 9
      })
    ).toEqual({
      id: 6,
      name: 'Full',
      data: { title: 'Hello' },
      filter: { age: [{ '>': '1h' }] },
      createdAt: '2026-08-15T00:00:00.000Z',
      validFrom: '2026-08-15T01:00:00.000Z',
      expiresAt: '2026-08-16T01:00:00.000Z',
      updatedAt: '2026-08-15T02:00:00.000Z',
      updatedBy: 9
    })
    expect(sourceNullableNotificationOneTimeListWire([])).toBeNull()
  })
})
