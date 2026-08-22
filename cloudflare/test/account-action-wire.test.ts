import { describe, expect, it } from 'vitest'

import {
  sourceAccountActionListWire,
  sourceAccountActionWire,
  sourceNullableAccountActionListWire
} from '../src/account-action-wire'

describe('source AccountAction JSON wire', () => {
  it('emits every required field and explicit pointer null', () => {
    expect(sourceAccountActionWire({})).toEqual({
      id: 0,
      accountAddress: '',
      createdAt: null,
      updatedAt: null,
      expiresAt: null,
      actionType: 'MOD_BAN',
      isActive: false,
      createdBy: null
    })
  })

  it('preserves a populated action without private fields', () => {
    expect(
      sourceAccountActionWire({
        id: 7,
        accountAddress: 'identity:player',
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T01:00:00.000Z',
        expiresAt: '2026-09-15T00:00:00.000Z',
        actionType: 'MOD_VET',
        isActive: true,
        createdBy: 11,
        accountID: 12,
        cursor: 'private'
      } as Parameters<typeof sourceAccountActionWire>[0] & {
        accountID: number
        cursor: string
      })
    ).toEqual({
      id: 7,
      accountAddress: 'identity:player',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T01:00:00.000Z',
      expiresAt: '2026-09-15T00:00:00.000Z',
      actionType: 'MOD_VET',
      isActive: true,
      createdBy: 11
    })
  })

  it('preserves source nonnil empty lists', () => {
    expect(sourceAccountActionListWire([])).toEqual([])
  })

  it('preserves source nil nested lists without changing populated lists', () => {
    expect(sourceNullableAccountActionListWire(undefined)).toBeNull()
    expect(
      sourceNullableAccountActionListWire([
        { id: 1, accountAddress: 'identity:player' }
      ])
    ).toEqual([
      {
        id: 1,
        accountAddress: 'identity:player',
        createdAt: null,
        updatedAt: null,
        expiresAt: null,
        actionType: 'MOD_BAN',
        isActive: false,
        createdBy: null
      }
    ])
  })
})
