import type { GMMatch, Match, MatchPlayer } from '@opensky/proto'

// The generated TypeScript declarations model RIDL pointers as optional
// properties, but encoding/json emits every field because the Go structs do
// not use omitempty. Keep the runtime wire exact even when a pointer is nil.
export const sourceMatchPlayerWire = (player: MatchPlayer): MatchPlayer =>
  ({
    id: player.id,
    address: player.address,
    name: player.name,
    region: player.region ?? null,
    tagArtID: player.tagArtID ?? null,
    crystalID: player.crystalID ?? null,
    deckString: player.deckString,
    initDeckString: player.initDeckString,
    deckClass: player.deckClass ?? null,
    playerSessionId: player.playerSessionId ?? null,
    isBot: player.isBot
  }) as unknown as MatchPlayer

export const sourceMatchWire = (match: Match): Match =>
  ({
    id: match.id,
    status: match.status,
    player1: match.player1 ? sourceMatchPlayerWire(match.player1) : null,
    player2: match.player2 ? sourceMatchPlayerWire(match.player2) : null,
    player1GameMode: match.player1GameMode,
    player2GameMode: match.player2GameMode,
    initPlayer1DeckNumCards: match.initPlayer1DeckNumCards,
    initPlayer2DeckNumCards: match.initPlayer2DeckNumCards,
    player1DeckClass: match.player1DeckClass ?? null,
    player2DeckClass: match.player2DeckClass ?? null,
    winningPlayer: match.winningPlayer ?? null,
    turnNonce: match.turnNonce,
    player1Moves: match.player1Moves,
    player2Moves: match.player2Moves,
    metrics: match.metrics ?? null,
    tutorialLevel: match.tutorialLevel ?? null,
    startedAt: match.startedAt ?? null,
    endedAt: match.endedAt ?? null,
    updatedAt: match.updatedAt ?? null,
    createdAt: match.createdAt ?? null,
    replayID: match.replayID
  }) as unknown as Match

export interface SourceGMMatchInput {
  match?: Match | null
  reviewed: boolean
  duration?: number | null
}

export const sourceGMMatchWire = (value: SourceGMMatchInput): GMMatch =>
  ({
    match: value.match ? sourceMatchWire(value.match) : null,
    reviewed: value.reviewed,
    duration: value.duration ?? null
  }) as unknown as GMMatch

export const sourceGMMatchListWire = (
  values: SourceGMMatchInput[]
): GMMatch[] => values.map(sourceGMMatchWire)
