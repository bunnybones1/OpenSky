import type {
  Account,
  GMAccount,
  GMStatsResponse,
  IPAddressHistory
} from '@opensky/proto'

import {
  sourceNullableAccountActionListWire,
  type SourceAccountActionInput
} from './account-action-wire'
import { sourceAccountWire } from './account-wire'

type Nullable<T> = T | null | undefined

export type SourceIPAddressHistoryInput = {
  id?: number
  ipAddress?: string
  createdAt?: Nullable<string>
}

/** Recreates encoding/json output for the generated Go IP history struct. */
export const sourceIPAddressHistoryWire = (
  history: SourceIPAddressHistoryInput
): IPAddressHistory =>
  ({
    id: history.id ?? 0,
    ipAddress: history.ipAddress ?? '',
    createdAt: history.createdAt ?? null
  }) as unknown as IPAddressHistory

export const sourceIPAddressHistoryListWire = (
  histories: readonly SourceIPAddressHistoryInput[]
): IPAddressHistory[] => histories.map(sourceIPAddressHistoryWire)

/** Source map lookups preserve a missing IP history slice as JSON null. */
export const sourceNullableIPAddressHistoryListWire = (
  histories: readonly SourceIPAddressHistoryInput[] | null | undefined
): IPAddressHistory[] | null =>
  histories == null ? null : sourceIPAddressHistoryListWire(histories)

export type SourceGMAccountInput = {
  account?: Nullable<Account>
  conquestsUnlocked?: boolean
  accountActions?: Nullable<readonly SourceAccountActionInput[]>
  ipHistory?: Nullable<readonly SourceIPAddressHistoryInput[]>
}

/** Recreates encoding/json output for the generated Go GMAccount struct. */
export const sourceGMAccountWire = (result: SourceGMAccountInput): GMAccount =>
  ({
    account: result.account == null ? null : sourceAccountWire(result.account),
    conquestsUnlocked: result.conquestsUnlocked ?? false,
    accountActions: sourceNullableAccountActionListWire(result.accountActions),
    ipHistory: sourceNullableIPAddressHistoryListWire(result.ipHistory)
  }) as unknown as GMAccount

/** The source staff-account handler allocates a non-nil result slice. */
export const sourceGMAccountListWire = (
  accounts: readonly SourceGMAccountInput[]
): GMAccount[] => accounts.map(sourceGMAccountWire)

export type SourceGMStatsInput = Partial<GMStatsResponse>

/** Recreates the complete zero-valued generated Go GMStatsResponse. */
export const sourceGMStatsWire = (
  stats: SourceGMStatsInput
): GMStatsResponse => ({
  total_active_users: stats.total_active_users ?? 0,
  total_suspended_users: stats.total_suspended_users ?? 0,
  total_banned_users: stats.total_banned_users ?? 0,
  total_vip_users: stats.total_vip_users ?? 0,
  total_flagged_users: stats.total_flagged_users ?? 0,
  total_to_delete_users: stats.total_to_delete_users ?? 0
})
