import type { FeedEvent } from '@opensky/proto'

import { sourceCardWire, type SourceCardInput } from './card-wire'

type SourceFeedEventInput = Pick<FeedEvent, 'id' | 'type'> &
  Partial<Omit<FeedEvent, 'id' | 'type' | 'cards'>> & {
    cards?: SourceCardInput[] | null
  }

// Go's FeedEvent has no omitempty JSON fields. Keep every public field on the
// wire, retain nil pointers/slices as explicit nulls, and project nested cards
// through their own public boundary.
export const sourceFeedEventWire = (event: SourceFeedEventInput): FeedEvent =>
  ({
    id: event.id,
    type: event.type,
    createdAt: event.createdAt ?? null,
    match: event.match ?? null,
    level: event.level ?? null,
    playerRank: event.playerRank ?? null,
    playerRankStage: event.playerRankStage ?? null,
    season: event.season ?? null,
    tokenIds: event.tokenIds ?? null,
    cards: event.cards?.map(sourceCardWire) ?? null,
    heroes: event.heroes ?? null,
    gameMode: event.gameMode ?? null,
    leaderboardRank: event.leaderboardRank ?? null,
    conquestV2Reward: event.conquestV2Reward ?? null,
    conquestV2TreasureLevel: event.conquestV2TreasureLevel ?? null,
    stickerPoints: event.stickerPoints ?? null
  }) as unknown as FeedEvent
