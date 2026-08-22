import type { AccountAction, ActionType } from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceAccountActionInput = {
  id?: number
  accountAddress?: string
  createdAt?: Nullable<string>
  updatedAt?: Nullable<string>
  expiresAt?: Nullable<string>
  actionType?: ActionType
  isActive?: boolean
  createdBy?: Nullable<number>
}

/** Recreates encoding/json output for the generated Go AccountAction struct. */
export const sourceAccountActionWire = (
  action: SourceAccountActionInput
): AccountAction =>
  ({
    id: action.id ?? 0,
    accountAddress: action.accountAddress ?? '',
    createdAt: action.createdAt ?? null,
    updatedAt: action.updatedAt ?? null,
    expiresAt: action.expiresAt ?? null,
    actionType: action.actionType ?? ('MOD_BAN' as ActionType),
    isActive: action.isActive ?? false,
    createdBy: action.createdBy ?? null
  }) as unknown as AccountAction

/** Source make/non-nil slice boundaries preserve an empty JSON array. */
export const sourceAccountActionListWire = (
  actions: readonly SourceAccountActionInput[]
): AccountAction[] => actions.map(sourceAccountActionWire)

/** Source map lookups preserve a missing action slice as JSON null. */
export const sourceNullableAccountActionListWire = (
  actions: readonly SourceAccountActionInput[] | null | undefined
): AccountAction[] | null =>
  actions == null ? null : sourceAccountActionListWire(actions)
