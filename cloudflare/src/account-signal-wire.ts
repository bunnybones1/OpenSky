import type {
  Account,
  AccountSignal,
  AccountSignalSummary,
  SignalStatus
} from '@opensky/proto'

import {
  sourceNullableAccountActionListWire,
  type SourceAccountActionInput
} from './account-action-wire'
import { sourceAccountWire } from './account-wire'
import { goFloat32 } from './go-numbers'

type Nullable<T> = T | null | undefined

export type SourceAccountSignalInput = {
  id?: number
  signalType?: string
  signalStatus?: SignalStatus
  createdAt?: Nullable<string>
  updatedAt?: Nullable<string>
  signalData?: unknown
  score?: number
}

/** Recreates encoding/json output for the generated Go AccountSignal struct. */
export const sourceAccountSignalWire = (
  signal: SourceAccountSignalInput
): AccountSignal =>
  ({
    id: signal.id ?? 0,
    signalType: signal.signalType ?? '',
    signalStatus: signal.signalStatus ?? ('PENDING' as SignalStatus),
    createdAt: signal.createdAt ?? null,
    updatedAt: signal.updatedAt ?? null,
    signalData: signal.signalData ?? null,
    score: goFloat32(signal.score ?? 0)
  }) as unknown as AccountSignal

/** Source make/non-nil slice boundaries preserve an empty JSON array. */
export const sourceAccountSignalListWire = (
  signals: readonly SourceAccountSignalInput[]
): AccountSignal[] => signals.map(sourceAccountSignalWire)

export type SourceAccountSignalSummaryInput = {
  accountAddress?: string
  score?: number
  updatedAt?: Nullable<string>
  account?: Nullable<Account>
  accountActions?: Nullable<readonly SourceAccountActionInput[]>
}

/** Recreates encoding/json output for the generated Go summary struct. */
export const sourceAccountSignalSummaryWire = (
  summary: SourceAccountSignalSummaryInput
): AccountSignalSummary =>
  ({
    accountAddress: summary.accountAddress ?? '',
    score: summary.score ?? 0,
    updatedAt: summary.updatedAt ?? null,
    account:
      summary.account == null ? null : sourceAccountWire(summary.account),
    accountActions: sourceNullableAccountActionListWire(summary.accountActions)
  }) as unknown as AccountSignalSummary

/** The source summary handler starts from a non-nil empty slice. */
export const sourceAccountSignalSummaryListWire = (
  summaries: readonly SourceAccountSignalSummaryInput[]
): AccountSignalSummary[] => summaries.map(sourceAccountSignalSummaryWire)
