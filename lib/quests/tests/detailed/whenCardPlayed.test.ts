import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { whenPlayersNonHeroAbilCardPlayed } from 'src/questHelpers'
import { accumulated } from 'src/types'
import { buildQuestHelper } from 'tests/questHelpers.test'
import { assert, describe, expect, test } from 'vitest'

import { createTestGame } from './questImplTestRunner'

describe('whenCardPlayed helper', () => {
  const playAirCard = accumulated(
    whenPlayersNonHeroAbilCardPlayed(c => c.state.view.element === 'air')
  )
  test('playing an air card increments', () => {
    const qm = buildQuestHelper(playAirCard)
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
      type: 'AddBaseCardToZone',
      player: 0,
      card: '2070',
      zone: { name: 'Hand', public: true }
    })

    assert(test.state)
    assert(test.state.playerCards[0].hand.length)
    const birb =
      test.state.playerCards[0].hand[test.state.playerCards[0].hand.length - 1]
    assert(birb)
    expect(
      (
        test.state.instances[birb] as {
          instance: CardInstance<SkyWeaver>
        }
      ).instance.base
    ).toBe('2070')

    // we cast birb
    test.takeAction(0, {
      type: 'PlayCard',
      cardID: birb,
      targetID: undefined
    })

    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })

  test("playing samya's speed counts as an air card played", () => {
    const qm = buildQuestHelper(playAirCard)
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
      type: 'AddBaseCardToZone',
      player: 0,
      card: '1101',
      zone: { name: 'Hand', public: true }
    })

    assert(test.state)
    assert(test.state.playerCards[0].hand.length)
    const samyasSpeed =
      test.state.playerCards[0].hand[test.state.playerCards[0].hand.length - 1]
    assert(samyasSpeed)
    expect(
      (
        test.state.instances[samyasSpeed] as {
          instance: CardInstance<SkyWeaver>
        }
      ).instance.base
    ).toBe('1101')

    test.cheat({
      type: 'SummonBaseUnit',
      player: 1,
      card: '20000'
    })

    assert(test.state)
    assert(test.state.playerCards[1].field.length)
    const unit = test.state.playerCards[1].field[0]
    assert(unit)
    expect(
      (
        test.state.instances[unit] as {
          instance: CardInstance<SkyWeaver>
        }
      ).instance.base
    ).toBe('20000')

    // we cast samya's speed
    test.takeAction(0, {
      type: 'PlayCard',
      cardID: samyasSpeed,
      targetID: test.state.playerCards[1].field[0]
    })

    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })
})
