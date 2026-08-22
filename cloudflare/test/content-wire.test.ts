import { describe, expect, it } from 'vitest'

import {
  sourceStickerListWire,
  sourceStickerOwnershipWire,
  sourceStickerWire,
  sourceTwitchFeaturedStreamerListWire,
  sourceTwitchFeaturedStreamerWire
} from '../src/content-wire'

describe('source content JSON wire', () => {
  it('emits only the featured streamer username field', () => {
    expect(sourceTwitchFeaturedStreamerWire({})).toEqual({ username: '' })
    expect(
      sourceTwitchFeaturedStreamerWire({
        username: 'weasel_tv',
        databaseID: 12
      } as Parameters<typeof sourceTwitchFeaturedStreamerWire>[0] & {
        databaseID: number
      })
    ).toEqual({ username: 'weasel_tv' })
    expect(sourceTwitchFeaturedStreamerListWire([])).toEqual([])
  })

  it('emits all six Sticker fields and strips schedule metadata', () => {
    expect(sourceStickerWire({})).toEqual({
      id: 0,
      name: '',
      requiredPoints: 0,
      asset: '',
      tokenId: 0,
      season: 0
    })
    expect(
      sourceStickerListWire([
        {
          id: 7,
          name: 'Cloud Weasel',
          requiredPoints: 25,
          asset: 'weasel.webp',
          tokenId: 77,
          season: 4,
          scheduleID: 99
        } as Parameters<typeof sourceStickerWire>[0] & {
          scheduleID: number
        }
      ])
    ).toEqual([
      {
        id: 7,
        name: 'Cloud Weasel',
        requiredPoints: 25,
        asset: 'weasel.webp',
        tokenId: 77,
        season: 4
      }
    ])
  })

  it('keeps the ownership map allocated and preserves nil tuple pointers', () => {
    expect(sourceStickerOwnershipWire({})).toEqual({ stickerBalances: {} })
    expect(
      sourceStickerOwnershipWire({
        stickerBalances: {
          77: { balance: '3' },
          88: null
        },
        accountID: 'private'
      } as Parameters<typeof sourceStickerOwnershipWire>[0] & {
        accountID: string
      })
    ).toEqual({
      stickerBalances: {
        77: { balance: '3', isNew: null },
        88: null
      }
    })
  })
})
