import type { PendingCardsResponse } from '@opensky/proto'

import { sourceCardWire, type SourceCardInput } from './card-wire'

export interface SourcePendingCardsResponseInput {
  cards?: SourceCardInput[] | null
  tokenIDs?: number[] | null
  mintAt: string
}

// PendingCardsResponse has no omitempty tags. Its two slices are left nil by
// the Go source until values are appended, so an empty slice-shaped input must
// cross the JSON boundary as null rather than an invented empty array.
export const sourcePendingCardsResponseWire = (
  pending: SourcePendingCardsResponseInput
): PendingCardsResponse =>
  ({
    cards:
      pending.cards?.length
        ? pending.cards.map(card => sourceCardWire(card))
        : null,
    tokenIDs: pending.tokenIDs?.length ? pending.tokenIDs : null,
    mintAt: pending.mintAt
  }) as unknown as PendingCardsResponse

// GetPendingCards declares its response slice without make(). With no source
// tasks it therefore serializes the generated `res` field as an explicit null.
export const sourcePendingCardsListWire = (
  pending: SourcePendingCardsResponseInput[] | null | undefined
): PendingCardsResponse[] | null =>
  pending?.length ? pending.map(sourcePendingCardsResponseWire) : null
