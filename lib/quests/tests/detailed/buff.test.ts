import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { buff } from 'src/questHelpers'
import { buildQuestHelper } from 'tests/questHelpers.test'
import { assert, describe, expect, test } from 'vitest'

import { createTestGame } from './questImplTestRunner'

describe('test buffing ', () => {
  const quest = buff()
  test('loaded die works', () => {
    const qm = buildQuestHelper(quest)
    const test = createTestGame(qm, [
      {
        cards: [],
        prisms: 'str'
      },
      {
        cards: [],
        prisms: 'str'
      }
    ])
    test.cheat({
      type: 'ChangeMaxMana',
      player: 0,
      delta: 50
    })

    test.cheat({
      type: 'SummonBaseUnit',
      player: 0,
      card: '2107'
    })
    test.cheat({
      type: 'SummonBaseUnit',
      player: 0,
      card: '2107'
    })
    test.cheat({
      type: 'SummonBaseUnit',
      player: 0,
      card: '2107'
    })
    const pokey = test.state?.playerCards[0].field[0]
    assert(pokey)
    assert(
      (test.state?.instances[pokey] as { instance: CardInstance<SkyWeaver> })
        .instance.base === '2107'
    )

    test.cheat({
      type: 'AddBaseCardToZone',
      card: '12',
      player: 0,
      zone: { name: 'Hand', public: true }
    })
    assert(test.state)

    const die =
      test.state.playerCards[0].hand[test.state.playerCards[0].hand.length - 1]
    assert(die)

    expect(qm.getProgressThisMatch()[0]).toBe(0)

    test.takeAction(0, {
      type: 'PlayCard',
      cardID: die,
      targetID: undefined
    })

    expect(qm.getProgressThisMatch()[0]).toBe(3)
  })
})
