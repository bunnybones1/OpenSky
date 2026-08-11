import { GameMode, MatchStatus, RewardExpReason } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  addExperience,
  awardMatchExperience,
  MatchExperiencePlayer,
  practiceExperienceCutoffLevel
} from '../src/experience'

const player = (
  overrides: Partial<MatchExperiencePlayer> = {}
): MatchExperiencePlayer => ({
  accountID: 1,
  principal: '0x1111111111111111111111111111111111111111',
  gameMode: GameMode.RANKED_CONSTRUCTED,
  level: 1,
  experience: 17,
  seasonLevel: 1,
  heroCount: 3,
  ...overrides
})

const reasons = (rewards: ReturnType<typeof awardMatchExperience>[number]) =>
  rewards.map(reward => reward.exp?.reason)

describe('source match experience awarder', () => {
  it('awards match-played and victory XP to a winner', () => {
    const rewards = awardMatchExperience({
      players: [player(), player({ accountID: 2 })],
      winner: 0,
      status: MatchStatus.COMPLETED,
      turnCount: 1
    })
    expect(reasons(rewards[0])).toEqual([
      RewardExpReason.MatchPlayed,
      RewardExpReason.Victory
    ])
    expect(rewards[0].map(reward => reward.exp?.amount)).toEqual([30, 20])
    expect(reasons(rewards[1])).toEqual([RewardExpReason.MatchPlayed])
  })

  it('awards match-played and draw XP to both eligible players', () => {
    const rewards = awardMatchExperience({
      players: [player(), player({ accountID: 2 })],
      winner: undefined,
      status: MatchStatus.COMPLETED,
      turnCount: 1
    })
    expect(reasons(rewards[0])).toEqual([
      RewardExpReason.MatchPlayed,
      RewardExpReason.Draw
    ])
    expect(reasons(rewards[1])).toEqual(reasons(rewards[0]))
  })

  it('requires three owned heroes', () => {
    const rewards = awardMatchExperience({
      players: [player({ heroCount: 2 }), player({ accountID: 2 })],
      winner: 0,
      status: MatchStatus.COMPLETED,
      turnCount: 10
    })
    expect(rewards[0]).toEqual([])
    expect(reasons(rewards[1])).toEqual([RewardExpReason.MatchPlayed])
  })

  it.each([MatchStatus.FORFEITED, MatchStatus.ABANDONED])(
    'withholds early loser XP for %s but preserves winner XP',
    status => {
      const early = awardMatchExperience({
        players: [player(), player({ accountID: 2 })],
        winner: 1,
        status,
        turnCount: 5
      })
      expect(early[0]).toEqual([])
      expect(reasons(early[1])).toEqual([
        RewardExpReason.MatchPlayed,
        RewardExpReason.Victory
      ])

      const longEnough = awardMatchExperience({
        players: [player(), player({ accountID: 2 })],
        winner: 1,
        status,
        turnCount: 6
      })
      expect(reasons(longEnough[0])).toEqual([RewardExpReason.MatchPlayed])
    }
  )

  it('preserves both source practice cutoff cohorts', () => {
    expect(practiceExperienceCutoffLevel('0x7fff')).toBe(15)
    expect(practiceExperienceCutoffLevel('0x8fff')).toBe(35)
    const rewards = awardMatchExperience({
      players: [
        player({
          principal: '0x7fff',
          gameMode: GameMode.PRACTICE_BOT,
          level: 15
        }),
        player({
          accountID: 2,
          principal: '0x8fff',
          gameMode: GameMode.PRACTICE_BOT,
          level: 34
        })
      ],
      winner: 1,
      status: MatchStatus.COMPLETED,
      turnCount: 20
    })
    expect(rewards[0]).toEqual([])
    expect(reasons(rewards[1])).toEqual([
      RewardExpReason.MatchPlayed,
      RewardExpReason.Victory
    ])
  })

  it('applies the source challenge cutoff and XP multiplier rounding', () => {
    const noRewards = awardMatchExperience({
      players: [
        player({
          principal: '0x8fff',
          gameMode: GameMode.CHALLENGE_CONSTRUCTED,
          level: 35
        }),
        player({
          accountID: 2,
          principal: '0x8aaa',
          gameMode: GameMode.CHALLENGE_CONSTRUCTED,
          level: 35
        })
      ],
      winner: 0,
      status: MatchStatus.COMPLETED,
      turnCount: 20
    })
    expect(noRewards).toEqual([[], []])

    const multiplied = awardMatchExperience({
      players: [player(), player({ accountID: 2 })],
      winner: 0,
      status: MatchStatus.COMPLETED,
      turnCount: 20,
      multiplier: 1.01
    })
    expect(multiplied[0].map(reward => reward.exp?.amount)).toEqual([31, 21])
  })

  it('levels linearly at the exact source 200 XP boundary', () => {
    expect(addExperience(1, 170, 30)).toEqual({ level: 2, experience: 0 })
    expect(addExperience(1, 170, 450)).toEqual({ level: 4, experience: 20 })
  })
})
