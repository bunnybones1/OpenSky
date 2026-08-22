import type {
  Sticker,
  StickerOwnershipResponse,
  TwitchFeaturedStreamer
} from '@opensky/proto'

import {
  sourceBalanceTupleWire,
  type SourceBalanceTupleInput
} from './card-balance-wire'

type Nullable<T> = T | null | undefined

export interface SourceTwitchFeaturedStreamerInput {
  username?: string
}

export interface SourceStickerInput {
  id?: number
  name?: string
  requiredPoints?: number
  asset?: string
  tokenId?: number
  season?: number
}

export interface SourceStickerOwnershipInput {
  stickerBalances?: Nullable<
    Record<string | number, Nullable<SourceBalanceTupleInput>>
  >
}

/** Recreates encoding/json output for TwitchFeaturedStreamer. */
export const sourceTwitchFeaturedStreamerWire = (
  streamer: SourceTwitchFeaturedStreamerInput
): TwitchFeaturedStreamer => ({
  username: streamer.username ?? ''
})

export const sourceTwitchFeaturedStreamerListWire = (
  streamers: readonly SourceTwitchFeaturedStreamerInput[]
): TwitchFeaturedStreamer[] => streamers.map(sourceTwitchFeaturedStreamerWire)

/** Recreates encoding/json output for the generated Go Sticker struct. */
export const sourceStickerWire = (sticker: SourceStickerInput): Sticker => ({
  id: sticker.id ?? 0,
  name: sticker.name ?? '',
  requiredPoints: sticker.requiredPoints ?? 0,
  asset: sticker.asset ?? '',
  tokenId: sticker.tokenId ?? 0,
  season: sticker.season ?? 0
})

export const sourceStickerListWire = (
  stickers: readonly SourceStickerInput[]
): Sticker[] => stickers.map(sourceStickerWire)

// GetStickerOwnership always initializes StickerBalances. Its BalanceTuple
// values leave IsNew nil, so the generated JSON response emits isNew: null.
export const sourceStickerOwnershipWire = (
  ownership: SourceStickerOwnershipInput
): StickerOwnershipResponse =>
  ({
    stickerBalances: Object.fromEntries(
      Object.entries(ownership.stickerBalances ?? {}).map(
        ([tokenID, tuple]) => [
          tokenID,
          tuple == null ? null : sourceBalanceTupleWire(tuple)
        ]
      )
    )
  }) as unknown as StickerOwnershipResponse
