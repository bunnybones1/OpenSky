import { CardInstance, Player, SkyWeaver } from '@skyweaver/state-metadata'
import { and, gameWin, hero } from 'src/questHelpers'
import { instantOneTimeEvent } from 'src/types'
import { buildQuestHelper } from 'tests/questHelpers.test'
import { assert, describe, expect, test } from 'vitest'

import { createTestGame } from './questImplTestRunner'

describe('test lethal with unit', () => {
  const quest = instantOneTimeEvent(
    and(gameWin, ({ player, cardCache }) => {
      const killer = hero((1 - player) as Player, cardCache)?.state.view
        .markedForDeath
      return (
        cardCache.getInstance(killer)?.base === '2107' &&
        cardCache.getLocation(killer)?.player === player
      )
    })
  )
  test('works', () => {
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
    const pokey = test.state?.playerCards[0].field[0]
    assert(pokey)
    assert(
      (test.state?.instances[pokey] as { instance: CardInstance<SkyWeaver> })
        .instance.base === '2107'
    )

    test.cheat({
      type: 'ApplyModifierToCard',
      card: { id: pokey },
      modifier: { SetDidAttack: false }
    })
    test.cheat({
      type: 'ApplyModifierToCard',
      card: { id: pokey },
      modifier: {
        SetAttackState: 'Ready'
      }
    })

    test.cheat({
      type: 'ApplyModifierToCard',
      card: { id: pokey },
      modifier: {
        ModifyPower: [99, undefined]
      }
    })
    const enemyHero = test.state?.playerCards[1].field[0]
    assert(enemyHero)

    console.log('attacking with ', pokey, enemyHero)
    test.takeAction(0, {
      type: 'Attack',
      attackerID: pokey,
      defenderID: enemyHero
    })

    const eh = test.state?.playerCards[1].field[0]
    assert(eh)
    expect(
      (test.state?.instances[eh] as { instance: CardInstance<SkyWeaver> })
        .instance.state.view.markedForDeath
    ).toEqual(pokey)

    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })
})
