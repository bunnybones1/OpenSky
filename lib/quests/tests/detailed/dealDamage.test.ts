import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { dealDamage } from 'src/questHelpers'
import { accumulated } from 'src/types'
import { buildQuestHelper } from 'tests/questHelpers.test'
import { assert, describe, expect, test } from 'vitest'

import { createTestGame } from './questImplTestRunner'

describe('dealDamage helper', () => {
  const quest = accumulated(
    dealDamage(
      ({ source, target, props: { cardCache, player } }) =>
        cardCache.getLocation(source)?.player === player &&
        cardCache.getLocation(target)?.player !== player
    )
  )
  test('doing 1dmg makes prog go up', () => {
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
      type: 'AddBaseCardToZone',
      player: 0,
      card: '20022',
      zone: { name: 'Hand', public: true }
    })

    assert(test.state)
    assert(test.state.playerCards[0].hand.length)
    const zap =
      test.state.playerCards[0].hand[test.state.playerCards[0].hand.length - 1]
    assert(zap)
    expect(
      (
        test.state.instances[zap] as {
          instance: CardInstance<SkyWeaver>
        }
      ).instance.base
    ).toBe('20022')

    const playerHp = (
      test.state?.instances[test.state.playerCards[1].field[0]] as
        | {
            instance: CardInstance<SkyWeaver>
          }
        | undefined
    )?.instance.state.view.health

    // we cast zap
    test.takeAction(0, {
      type: 'PlayCard',
      cardID: zap,
      targetID: test.state.playerCards[1].field[0]
    })

    assert(playerHp)
    expect(
      (
        test.state?.instances[test.state.playerCards[1].field[0]] as
          | {
              instance: CardInstance<SkyWeaver>
            }
          | undefined
      )?.instance.state.view.health
    ).toEqual(playerHp - 1)

    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })
  test('doing 0dmg doesnt make prog go up', () => {
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
      type: 'AddBaseCardToZone',
      player: 0,
      card: '20022',
      zone: { name: 'Hand', public: true }
    })

    assert(test.state)
    assert(test.state.playerCards[0].hand.length)
    const zap =
      test.state.playerCards[0].hand[test.state.playerCards[0].hand.length - 1]
    assert(zap)
    expect(
      (
        test.state.instances[zap] as {
          instance: CardInstance<SkyWeaver>
        }
      ).instance.base
    ).toBe('20022')

    const playerHp = (
      test.state?.instances[test.state.playerCards[1].field[0]] as
        | {
            instance: CardInstance<SkyWeaver>
          }
        | undefined
    )?.instance.state.view.health

    // give enemy hero armor
    test.cheat({
      type: 'ApplyModifierToCard',
      card: { id: test.state.playerCards[1].field[0] },
      modifier: {
        GrantTrait: 'armor'
      }
    })

    // we cast zap
    test.takeAction(0, {
      type: 'PlayCard',
      cardID: zap,
      targetID: test.state.playerCards[1].field[0]
    })

    assert(playerHp)
    expect(
      (
        test.state?.instances[test.state.playerCards[1].field[0]] as
          | {
              instance: CardInstance<SkyWeaver>
            }
          | undefined
      )?.instance.state.view.health
    ).toEqual(playerHp)

    expect(qm.getProgressThisMatch()[0]).toBe(0)
  })
})
