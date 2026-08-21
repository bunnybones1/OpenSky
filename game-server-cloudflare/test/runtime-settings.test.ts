import { describe, expect, it } from 'vitest'

import { sourceChatEnabled } from '../src/runtime-settings'

describe('source game-server runtime settings', () => {
  it('enables chat only for the explicit true deployment value', () => {
    expect(sourceChatEnabled('true')).toBe(true)
    for (const value of [undefined, '', 'false', 'TRUE', '1']) {
      expect(sourceChatEnabled(value)).toBe(false)
    }
  })
})
