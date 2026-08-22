import type { Account, FriendPoints } from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceFriendPointsAccountInput = Pick<
  Account,
  'id' | 'address' | 'name' | 'locale' | 'level'
> &
  Partial<Account>

export type SourceGiftedInviterAccountInput = Pick<
  Account,
  'id' | 'address' | 'name' | 'locale' | 'warmUps' | 'level'
> &
  Partial<Account>

export type SourceFriendPointsInput = {
  account?: Nullable<SourceFriendPointsAccountInput>
  season?: number
  levels?: number
  points?: number
  pointsSpent?: number
}

export type SourceFriendPointsResponseInput = {
  total?: number
  friends?: Nullable<readonly Nullable<SourceFriendPointsInput>[]>
}

export type SourcePointsGiftedResponseInput = {
  total?: number
  inviter?: Nullable<SourceGiftedInviterAccountInput>
}

/**
 * GetFriendsList selects only these Account columns in the source query. Go's
 * encoding/json still emits all public Account fields with their zero values.
 */
export const sourceFriendPointsAccountWire = (
  account: SourceFriendPointsAccountInput
): Account =>
  ({
    id: account.id,
    address: account.address,
    name: account.name,
    locale: account.locale,
    createdAt: null,
    updatedAt: null,
    experience: 0,
    warmUps: 0,
    level: account.level,
    seasonLevel: 0,
    levelUpXP: 0,
    stats: null,
    region: account.region ?? null,
    tagArtID: account.tagArtID ?? null,
    crystalID: null,
    titleID: null,
    settings: null,
    invitedBy: null,
    isBurnerWallet: null
  }) as unknown as Account

/**
 * GetPointsGifted loads its inviter directly from the source accounts table,
 * without the runtime account decorators used by GetAccount.
 */
export const sourceGiftedInviterAccountWire = (
  account: SourceGiftedInviterAccountInput
): Account =>
  ({
    id: account.id,
    address: account.address,
    name: account.name,
    locale: account.locale,
    createdAt: account.createdAt ?? null,
    updatedAt: account.updatedAt ?? null,
    experience: 0,
    warmUps: account.warmUps,
    level: account.level,
    seasonLevel: 0,
    levelUpXP: 0,
    stats: null,
    region: account.region ?? null,
    tagArtID: account.tagArtID ?? null,
    crystalID: null,
    titleID: null,
    settings: null,
    invitedBy: null,
    isBurnerWallet: null
  }) as unknown as Account

/** Recreates encoding/json output for the generated Go FriendPoints struct. */
export const sourceFriendPointsWire = (
  friend: SourceFriendPointsInput
): FriendPoints =>
  ({
    account:
      friend.account == null
        ? null
        : sourceFriendPointsAccountWire(friend.account),
    season: friend.season ?? 0,
    levels: friend.levels ?? 0,
    points: friend.points ?? 0,
    pointsSpent: friend.pointsSpent ?? 0
  }) as unknown as FriendPoints

/** The source DB adapter resets an empty destination slice to non-nil []. */
export const sourceFriendPointsResponseWire = (
  response: SourceFriendPointsResponseInput
): { total: number; friends: FriendPoints[] | null } => ({
  total: response.total ?? 0,
  friends:
    response.friends == null
      ? response.friends === null
        ? null
        : []
      : (response.friends.map(friend =>
          friend == null ? null : sourceFriendPointsWire(friend)
        ) as unknown as FriendPoints[])
})

/** Recreates the generated GetPointsGifted response wrapper. */
export const sourcePointsGiftedResponseWire = (
  response: SourcePointsGiftedResponseInput
): { total: number; inviter: Account | null } => ({
  total: response.total ?? 0,
  inviter:
    response.inviter == null
      ? null
      : sourceGiftedInviterAccountWire(response.inviter)
})
