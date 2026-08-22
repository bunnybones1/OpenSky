import { GameMode } from '@opensky/proto'
import { describe, expect, it, vi } from 'vitest'

import { parseReplayLogs } from '../src/Match'

const initRecord = JSON.stringify([
  {
    type: 'init',
    version: 'test-release',
    players: [],
    rootProof: '0x00',
    secrets: [],
    gameMode: GameMode.PRACTICE_BOT,
    timestamp: '2026-08-12T00:00:00.000Z'
  }
])

const gameplayRecord = (timestamp: string, diff: string) =>
  JSON.stringify([
    {
      type: 'gameplay',
      timestamp,
      message: { type: 'gameplay', data: [diff] }
    }
  ])

describe('replay parsing compatibility', () => {
  it('retains gameplay actions in chronological archive order', () => {
    const parsed = parseReplayLogs([
      initRecord,
      gameplayRecord('2026-08-12T00:00:01.000Z', '0x01'),
      gameplayRecord('2026-08-12T00:00:02.000Z', '0x02')
    ])
    expect(parsed.actions.map(action => action.diffs)).toEqual([
      ['0x01'],
      ['0x02']
    ])
    expect(parsed.highestSeenTime).toBe(
      Date.parse('2026-08-12T00:00:02.000Z')
    )
  })

  it('retains the source safeguard for a reused match ID', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const parsed = parseReplayLogs([
      initRecord,
      gameplayRecord('2026-08-12T00:00:02.000Z', '0x02'),
      gameplayRecord('2026-08-12T00:00:01.000Z', '0x01'),
      gameplayRecord('2026-08-12T00:00:03.000Z', '0x03')
    ])
    expect(parsed.actions.map(action => action.diffs)).toEqual([['0x02']])
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })

  it('rejects an archive without a leading init log', () => {
    expect(() => parseReplayLogs([gameplayRecord('2026-08-12T00:00:01.000Z', '0x01')])).toThrow(
      'Replay does not start with an init log'
    )
  })
})
