import type { Account } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import type { SourceAccountActionInput } from '../src/account-action-wire'
import {
  sourceGMAccountListWire,
  sourceGMAccountWire,
  sourceGMStatsWire,
  sourceIPAddressHistoryWire,
  sourceNullableIPAddressHistoryListWire,
  type SourceIPAddressHistoryInput
} from '../src/staff-account-wire'

const account = {
  id: 7,
  address: 'identity:player',
  name: 'Player',
  locale: 'en',
  experience: 10,
  warmUps: 0,
  level: 2,
  seasonLevel: 1,
  levelUpXP: 200
} as Account

describe('source staff account JSON wire', () => {
  it('emits the exact IP-history fields, required null, and no account ID', () => {
    expect(
      sourceIPAddressHistoryWire({
        id: 9,
        ipAddress: '192.0.2.55',
        accountID: 7,
        createdAt: undefined
      } as Parameters<typeof sourceIPAddressHistoryWire>[0] & {
        accountID: number
      })
    ).toEqual({
      id: 9,
      ipAddress: '192.0.2.55',
      createdAt: null
    })
  })

  it('distinguishes a nil IP map entry from an allocated empty slice', () => {
    expect(sourceNullableIPAddressHistoryListWire(undefined)).toBeNull()
    expect(sourceNullableIPAddressHistoryListWire([])).toEqual([])
  })

  it('emits all GMAccount fields and composes nested privacy boundaries', () => {
    expect(
      sourceGMAccountWire({
        account,
        conquestsUnlocked: true,
        accountActions: [
          {
            id: 11,
            accountAddress: account.address,
            actionType: 'MOD_VET',
            accountID: 7
          } as SourceAccountActionInput & { accountID: number }
        ],
        ipHistory: [
          {
            id: 9,
            ipAddress: '192.0.2.55',
            createdAt: '2026-08-15T00:00:00.000Z',
            accountID: 7
          } as SourceIPAddressHistoryInput & { accountID: number }
        ]
      })
    ).toEqual({
      account: expect.objectContaining({
        address: 'identity:player',
        createdAt: null,
        settings: null
      }),
      conquestsUnlocked: true,
      accountActions: [
        {
          id: 11,
          accountAddress: 'identity:player',
          createdAt: null,
          updatedAt: null,
          expiresAt: null,
          actionType: 'MOD_VET',
          isActive: false,
          createdBy: null
        }
      ],
      ipHistory: [
        {
          id: 9,
          ipAddress: '192.0.2.55',
          createdAt: '2026-08-15T00:00:00.000Z'
        }
      ]
    })
  })

  it('preserves required zero/null values and a nonnil outer list', () => {
    expect(sourceGMAccountWire({})).toEqual({
      account: null,
      conquestsUnlocked: false,
      accountActions: null,
      ipHistory: null
    })
    expect(sourceGMAccountListWire([])).toEqual([])
  })
})

describe('source GMStatsResponse JSON wire', () => {
  it('emits all six zero-valued counters and strips extra state', () => {
    expect(
      sourceGMStatsWire({
        total_active_users: 3,
        cursor: 'private'
      } as Parameters<typeof sourceGMStatsWire>[0] & { cursor: string })
    ).toEqual({
      total_active_users: 3,
      total_suspended_users: 0,
      total_banned_users: 0,
      total_vip_users: 0,
      total_flagged_users: 0,
      total_to_delete_users: 0
    })
  })
})
