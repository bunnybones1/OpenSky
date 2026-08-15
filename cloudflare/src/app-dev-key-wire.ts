import type { AppDevKey } from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceAppDevKeyInput = {
  id?: number
  appKey?: string
  name?: string
  email?: string
  disabled?: boolean
  createdBy?: Nullable<number>
  updatedBy?: Nullable<number>
  createdAt?: Nullable<string>
  updatedAt?: Nullable<string>
}

/** Recreates encoding/json output for the generated Go AppDevKey struct. */
export const sourceAppDevKeyWire = (
  appDevKey: SourceAppDevKeyInput
): AppDevKey =>
  ({
    id: appDevKey.id ?? 0,
    appKey: appDevKey.appKey ?? '',
    name: appDevKey.name ?? '',
    email: appDevKey.email ?? '',
    disabled: appDevKey.disabled ?? false,
    createdBy: appDevKey.createdBy ?? null,
    updatedBy: appDevKey.updatedBy ?? null,
    createdAt: appDevKey.createdAt ?? null,
    updatedAt: appDevKey.updatedAt ?? null
  }) as unknown as AppDevKey

/** The source list starts as a nonnil empty slice, preserving an empty array. */
export const sourceAppDevKeyListWire = (
  appDevKeys: readonly SourceAppDevKeyInput[]
): AppDevKey[] => appDevKeys.map(sourceAppDevKeyWire)
