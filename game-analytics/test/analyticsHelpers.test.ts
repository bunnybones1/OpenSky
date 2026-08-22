import { DeckType, GameMode } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { processToCSV } from '../src/analyticsHelpers'
import type { MatchData } from '../src/Match'

describe('game analytics CSV compatibility', () => {
  it('preserves the source three-table schema and NULL winner', () => {
    const data: MatchData = {
      type: 'matchData',
      matchStartTimeStamp: new Date('2026-08-12T01:02:03.456Z'),
      matchEndTimeStamp: new Date('2026-08-12T01:03:05.999Z'),
      dataUploadTimeStamp: new Date('2026-08-12T01:04:00.001Z'),
      durationInSec: 62,
      gameMode: GameMode.PRACTICE_BOT,
      matchID: 42,
      p0Address: 'cloud-weasel:one',
      p1Address: 'cloud-weasel:bot',
      p0DeckString: 'SWxSTR02',
      p0DeckVersion: '02',
      p0DeckType: DeckType.CUSTOM,
      p0DeckCards: [],
      p1DeckString: null,
      p1DeckVersion: '02',
      p1DeckType: DeckType.RANDOM,
      p1DeckCards: [],
      turnCount: 1,
      moveCount: 1,
      p0CardSelection: [],
      p1CardSelection: [],
      p0OpeningHandSelection: [],
      p1OpeningHandSelection: [],
      winner: undefined,
      gameStateData: [],
      moveData: []
    }

    const csv = processToCSV(data)
    expect(csv.generalMatchData).toContain(
      'MatchID,MatchStartTime,MatchEndTime,MatchUploadTime,DurationInSec'
    )
    expect(csv.generalMatchData).toContain(
      '42,2026-08-12 01:02:03.456,2026-08-12 01:03:05.999,2026-08-12 01:04:00.001,62'
    )
    expect(csv.generalMatchData.endsWith(',NULL\n')).toBe(true)
    expect(csv.gameStateData.split('\n')).toHaveLength(2)
    expect(csv.moveData.split('\n')).toHaveLength(2)
  })
})
