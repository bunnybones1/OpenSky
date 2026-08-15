import { describe, expect, it } from 'vitest'

import {
  sourceFriendPointsResponseWire,
  sourceFriendPointsWire,
  sourceGiftedInviterAccountWire,
  sourcePointsGiftedResponseWire
} from '../src/friend-points-wire'

const partialAccount = {
  id: 41,
  address: 'identity:friend',
  name: 'Friend.Weasel',
  locale: 'en-CA',
  createdAt: '2026-08-15T12:00:00.000Z',
  updatedAt: '2026-08-15T13:00:00.000Z',
  experience: 999,
  warmUps: 7,
  level: 12,
  seasonLevel: 8,
  levelUpXP: 321,
  stats: { rankedConstructed: { gamesPlayed: 20 } },
  region: 'CA',
  tagArtID: 'weasel-clouds',
  crystalID: 7,
  titleID: 4,
  settings: { hidePlayerNames: true },
  invitedBy: 'identity:inviter',
  isBurnerWallet: false,
  internalOnly: 'must not leak'
} as never

const zeroDecorators = {
  experience: 0,
  seasonLevel: 0,
  levelUpXP: 0,
  stats: null,
  crystalID: null,
  titleID: null,
  settings: null,
  invitedBy: null,
  isBurnerWallet: null
}

describe('source friend-points wire compatibility', () => {
  it('projects GetFriendsList partial accounts with Go zero values', () => {
    expect(
      sourceFriendPointsWire({
        account: partialAccount,
        season: 17,
        levels: 3,
        points: 7,
        pointsSpent: 1
      })
    ).toEqual({
      account: {
        id: 41,
        address: 'identity:friend',
        name: 'Friend.Weasel',
        locale: 'en-CA',
        createdAt: null,
        updatedAt: null,
        ...zeroDecorators,
        warmUps: 0,
        level: 12,
        region: 'CA',
        tagArtID: 'weasel-clouds'
      },
      season: 17,
      levels: 3,
      points: 7,
      pointsSpent: 1
    })
  })

  it('projects the undecorated inviter loaded by GetPointsGifted', () => {
    expect(sourceGiftedInviterAccountWire(partialAccount)).toEqual({
      id: 41,
      address: 'identity:friend',
      name: 'Friend.Weasel',
      locale: 'en-CA',
      createdAt: '2026-08-15T12:00:00.000Z',
      updatedAt: '2026-08-15T13:00:00.000Z',
      ...zeroDecorators,
      warmUps: 7,
      level: 12,
      region: 'CA',
      tagArtID: 'weasel-clouds'
    })
  })

  it('preserves generated wrapper, pointer, and empty-slice semantics', () => {
    expect(sourceFriendPointsWire({})).toEqual({
      account: null,
      season: 0,
      levels: 0,
      points: 0,
      pointsSpent: 0
    })
    expect(sourceFriendPointsResponseWire({})).toEqual({
      total: 0,
      friends: []
    })
    expect(sourceFriendPointsResponseWire({ friends: null })).toEqual({
      total: 0,
      friends: null
    })
    expect(sourcePointsGiftedResponseWire({})).toEqual({
      total: 0,
      inviter: null
    })
  })
})
