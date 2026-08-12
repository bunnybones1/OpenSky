import { ConquestMatchResult } from '@opensky/proto'
import { parseConquestMatchProgress } from '@opensky/shared/conquest-progress'
import { describe, expect, it } from 'vitest'

describe('source Conquest progress JSON decoder', () => {
  it('preserves generated Go nil-map, uint64-key, and enum normalization', () => {
    expect(parseConquestMatchProgress('null')).toEqual({})
    expect(
      parseConquestMatchProgress(
        '{"+01":"FUTURE_VALUE","0":"DRAW","2":null}'
      )
    ).toEqual({
      0: ConquestMatchResult.DRAW,
      1: ConquestMatchResult.UNKNOWN,
      2: ConquestMatchResult.UNKNOWN
    })
  })

  it.each([
    ['invalid JSON', '['],
    ['an array', '[]'],
    ['a nonnumeric match ID', '{"not-a-match":"WIN"}'],
    ['an out-of-range match ID', '{"18446744073709551616":"WIN"}'],
    ['a non-string match result', '{"10":1}']
  ])('rejects %s', (_description, value) => {
    expect(() => parseConquestMatchProgress(value)).toThrow(
      'Conquest match progress is malformed'
    )
  })
})
