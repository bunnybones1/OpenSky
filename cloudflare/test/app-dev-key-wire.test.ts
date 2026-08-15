import { describe, expect, it } from 'vitest'

import {
  sourceAppDevKeyListWire,
  sourceAppDevKeyWire
} from '../src/app-dev-key-wire'

describe('source AppDevKey JSON wire', () => {
  it('emits every required field and explicit pointer null', () => {
    expect(sourceAppDevKeyWire({})).toEqual({
      id: 0,
      appKey: '',
      name: '',
      email: '',
      disabled: false,
      createdBy: null,
      updatedBy: null,
      createdAt: null,
      updatedAt: null
    })
  })

  it('preserves a populated key without the private cursor', () => {
    expect(
      sourceAppDevKeyWire({
        id: 7,
        appKey: 'SW01abc',
        name: 'partner',
        email: 'partner@example.com',
        disabled: true,
        createdBy: 11,
        updatedBy: 12,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T01:00:00.000Z'
      })
    ).toEqual({
      id: 7,
      appKey: 'SW01abc',
      name: 'partner',
      email: 'partner@example.com',
      disabled: true,
      createdBy: 11,
      updatedBy: 12,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T01:00:00.000Z'
    })
  })

  it('preserves the source nonnil empty list', () => {
    expect(sourceAppDevKeyListWire([])).toEqual([])
  })
})
