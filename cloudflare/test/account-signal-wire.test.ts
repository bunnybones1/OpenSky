import type { Account } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import type { SourceAccountActionInput } from '../src/account-action-wire'
import {
  sourceAccountSignalListWire,
  sourceAccountSignalSummaryListWire,
  sourceAccountSignalSummaryWire,
  sourceAccountSignalWire
} from '../src/account-signal-wire'
import { sourceAccountWire } from '../src/account-wire'

describe('source AccountSignal JSON wire', () => {
  it('emits every required field and explicit pointer/interface null', () => {
    expect(sourceAccountSignalWire({})).toEqual({
      id: 0,
      signalType: '',
      signalStatus: 'PENDING',
      createdAt: null,
      updatedAt: null,
      signalData: null,
      score: 0
    })
  })

  it('preserves populated signal data and float32 JSON without private fields', () => {
    expect(
      sourceAccountSignalWire({
        id: 7,
        signalType: 'user report',
        signalStatus: 'ACTED_UPON',
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T01:00:00.000Z',
        signalData: { count: 3 },
        score: 3.190000057220459,
        accountID: 12,
        payload: 'private',
        mlScore: 99,
        cursor: 'private'
      } as Parameters<typeof sourceAccountSignalWire>[0] & {
        accountID: number
        payload: string
        mlScore: number
        cursor: string
      })
    ).toEqual({
      id: 7,
      signalType: 'user report',
      signalStatus: 'ACTED_UPON',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T01:00:00.000Z',
      signalData: { count: 3 },
      score: 3.19
    })
  })

  it('preserves the source nonnil empty signal list', () => {
    expect(sourceAccountSignalListWire([])).toEqual([])
  })
})

describe('source AccountSignalSummary JSON wire', () => {
  it('emits every required field and explicit nested null', () => {
    expect(sourceAccountSignalSummaryWire({})).toEqual({
      accountAddress: '',
      score: 0,
      updatedAt: null,
      account: null,
      accountActions: null
    })
  })

  it('normalizes the nested Account and AccountAction privacy boundaries', () => {
    const account = {
      id: 4,
      address: 'identity:player',
      name: 'Player',
      locale: 'en',
      experience: 10,
      warmUps: 0,
      level: 2,
      seasonLevel: 1,
      levelUpXP: 200
    } as Account
    const summary = sourceAccountSignalSummaryWire({
      accountAddress: 'identity:player',
      score: 1.25,
      updatedAt: '2026-08-15T02:00:00.000Z',
      account,
      accountActions: [
        {
          id: 9,
          accountAddress: 'identity:player',
          actionType: 'MOD_VET',
          accountID: 4,
          cursor: 'private'
        } as SourceAccountActionInput & {
          accountID: number
          cursor: string
        }
      ],
      accountID: 4,
      cursor: 'private'
    } as Parameters<typeof sourceAccountSignalSummaryWire>[0] & {
      accountID: number
      cursor: string
    })

    expect(summary).toEqual({
      accountAddress: 'identity:player',
      score: 1.25,
      updatedAt: '2026-08-15T02:00:00.000Z',
      account: sourceAccountWire(account),
      accountActions: [
        {
          id: 9,
          accountAddress: 'identity:player',
          createdAt: null,
          updatedAt: null,
          expiresAt: null,
          actionType: 'MOD_VET',
          isActive: false,
          createdBy: null
        }
      ]
    })
  })

  it('preserves the source nonnil empty summary list', () => {
    expect(sourceAccountSignalSummaryListWire([])).toEqual([])
  })
})
