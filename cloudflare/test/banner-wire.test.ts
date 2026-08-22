import { BannerType } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceBannerWire,
  sourceNullableBannerListWire
} from '../src/banner-wire'

describe('source banner JSON wire', () => {
  it('emits required enum and color pointers as explicit null', () => {
    expect(sourceBannerWire({})).toEqual({
      order: 0,
      type: null,
      color: null,
      msg: '',
      dismissable: false,
      id: 0
    })
  })

  it('preserves populated fields and omits only tagged optional pointers', () => {
    expect(
      sourceBannerWire({
        order: 3,
        type: BannerType.WARNING,
        color: '#f0a',
        msg: 'Cloud Weasel',
        dismissable: true,
        id: 9,
        link: '/play',
        startAt: '2026-08-15T00:00:00.000Z',
        endAt: '2026-08-16T00:00:00.000Z'
      })
    ).toEqual({
      order: 3,
      type: 'WARNING',
      color: '#f0a',
      msg: 'Cloud Weasel',
      dismissable: true,
      id: 9,
      link: '/play',
      startAt: '2026-08-15T00:00:00.000Z',
      endAt: '2026-08-16T00:00:00.000Z'
    })
  })

  it('preserves source nil list output', () => {
    expect(sourceNullableBannerListWire([])).toBeNull()
  })
})
