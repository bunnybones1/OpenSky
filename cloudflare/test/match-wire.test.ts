import type { GameMode, Match, MatchPlayer, MatchStatus } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import {
  sourceGMMatchListWire,
  sourceGMMatchWire,
  sourceMatchWire
} from '../src/match-wire'

const player = (id: number): MatchPlayer =>
  ({
    id,
    address: `identity:player-${id}`,
    name: `Player ${id}`,
    deckString: 'SWxSTR',
    initDeckString: 'SWxSTR',
    deckClass: undefined,
    isBot: false
  }) as unknown as MatchPlayer

describe('generated Go match JSON wire', () => {
  it('serializes every nil Match and MatchPlayer pointer as an explicit null', () => {
    const wire = sourceMatchWire({
      id: 42,
      status: 'IN_PROGRESS' as MatchStatus,
      player1: player(1),
      player2: player(2),
      player1GameMode: 'CHALLENGE_CONSTRUCTED' as GameMode,
      player2GameMode: 'CHALLENGE_CONSTRUCTED' as GameMode,
      initPlayer1DeckNumCards: 30,
      initPlayer2DeckNumCards: 30,
      turnNonce: 0,
      player1Moves: 0,
      player2Moves: 0,
      metrics: {},
      replayID: 'match-wire-replay'
    } as Match)

    expect(wire).toEqual({
      id: 42,
      status: 'IN_PROGRESS',
      player1: {
        id: 1,
        address: 'identity:player-1',
        name: 'Player 1',
        region: null,
        tagArtID: null,
        crystalID: null,
        deckString: 'SWxSTR',
        initDeckString: 'SWxSTR',
        deckClass: null,
        playerSessionId: null,
        isBot: false
      },
      player2: {
        id: 2,
        address: 'identity:player-2',
        name: 'Player 2',
        region: null,
        tagArtID: null,
        crystalID: null,
        deckString: 'SWxSTR',
        initDeckString: 'SWxSTR',
        deckClass: null,
        playerSessionId: null,
        isBot: false
      },
      player1GameMode: 'CHALLENGE_CONSTRUCTED',
      player2GameMode: 'CHALLENGE_CONSTRUCTED',
      initPlayer1DeckNumCards: 30,
      initPlayer2DeckNumCards: 30,
      player1DeckClass: null,
      player2DeckClass: null,
      winningPlayer: null,
      turnNonce: 0,
      player1Moves: 0,
      player2Moves: 0,
      metrics: {},
      tutorialLevel: null,
      startedAt: null,
      endedAt: null,
      updatedAt: null,
      createdAt: null,
      replayID: 'match-wire-replay'
    })
  })

  it('serializes every nil GMMatch pointer and a non-nil empty list exactly', () => {
    expect(
      sourceGMMatchWire({ match: null, reviewed: false, duration: undefined })
    ).toEqual({
      match: null,
      reviewed: false,
      duration: null
    })
    expect(sourceGMMatchListWire([])).toEqual([])
  })
})
