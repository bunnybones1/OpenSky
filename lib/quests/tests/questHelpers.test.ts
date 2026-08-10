import { GameMode, Hero } from '@opensky/proto'
import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { assert, describe, expect, test } from 'vitest'

import { PlayerQuestManager } from '../src/playerQuestManager'
import {
  buff,
  resetsAfterTurn,
  resetStatefulEventOnCondition
} from '../src/questHelpers'
import { oneTimeEvent, QuestImplementation } from '../src/types'
import { createTestGame } from './detailed/questImplTestRunner'

describe('Quest Helpers', () => {
  test("turn limited stateful doesn't complete cross-turn", () => {
    const qm = buildQuestHelper(
      resetStatefulEventOnCondition(
        oneTimeEvent({
          initState: () => 0,
          done: s => s >= 10,
          modifyState: ({ state }) => state + 1
        }),
        resetsAfterTurn
      )
    )
    for (let i = 0; i < 8; i++) {
      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
    }
    qm.onProcessEvent({
      type: 'GameEvent',
      payload: {
        event: {
          type: 'ExitPhase',
          payload: {
            type: 'EndTurn',
            payload: {
              player: 0,
              turnCount: 1234
            }
          }
        }
      }
    })
    for (let i = 0; i < 8; i++) {
      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
    }
    expect(qm.getProgressThisMatch()[0]).toBe(0)
  })
  test("turn limited stateful does complete within one turn and doesn't reset at turn end", () => {
    const qm = buildQuestHelper(
      resetStatefulEventOnCondition(
        oneTimeEvent({
          initState: () => 0,
          done: s => s >= 10,
          modifyState: ({ state }) => state + 1
        }),
        resetsAfterTurn
      )
    )
    for (let i = 0; i < 20; i++) {
      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
    }
    qm.onProcessEvent({
      type: 'GameEvent',
      payload: {
        event: {
          type: 'ExitPhase',
          payload: {
            type: 'EndTurn',
            payload: {
              player: 0,
              turnCount: 1234
            }
          }
        }
      }
    })
    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })

  test('buff works', () => {
    const qm = buildQuestHelper(buff(() => true))
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
      card: '20000'
    })
    expect(
      (
        test.state?.instances[test.state.playerCards[0].field[0]] as
          | {
              instance: CardInstance<SkyWeaver>
            }
          | undefined
      )?.instance.base
    ).toBe('20000')

    test.cheat({
      type: 'AddBaseCardToZone',
      player: 0,
      card: '68',
      zone: { name: 'Hand', public: true }
    })

    assert(test.state)
    assert(test.state.playerCards[0].hand.length)
    const gobletOfArmis =
      test.state.playerCards[0].hand[test.state.playerCards[0].hand.length - 1]
    assert(gobletOfArmis)
    expect(
      (
        test.state.instances[gobletOfArmis] as {
          instance: CardInstance<SkyWeaver>
        }
      ).instance.base
    ).toBe('68')

    const unitHp = (
      test.state?.instances[test.state.playerCards[0].field[0]] as
        | {
            instance: CardInstance<SkyWeaver>
          }
        | undefined
    )?.instance.state.view.health

    // we cast goblet
    test.takeAction(0, {
      type: 'PlayCard',
      cardID: gobletOfArmis,
      targetID: undefined
    })

    assert(unitHp)
    expect(
      (
        test.state?.instances[test.state.playerCards[0].field[0]] as
          | {
              instance: CardInstance<SkyWeaver>
            }
          | undefined
      )?.instance.state.view.health
    ).toBeGreaterThan(unitHp)

    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })
})

export function buildQuestHelper(
  quest: QuestImplementation
): PlayerQuestManager {
  return new PlayerQuestManager({
    deck: [],
    gameMode: GameMode.RANKED_CONSTRUCTED,
    hero: Hero.UNKNOWN,
    player: 0,
    quests: [
      {
        id: 0,
        impl: {
          ...quest,
          modifyState: p => {
            if (
              p.lastEvent?.type === 'GameEvent' &&
              p.lastEvent.payload.event.type === 'ExitPhase' &&
              p.lastEvent.payload.event.payload.type === 'ModifyCard' &&
              p.lastEvent.payload.event.payload.payload.modifier ===
                'CheatedByPlayingIllegalHandCard'
            ) {
              throw new Error(
                'Bad test. Got error CheatedByPlayingIllegalHandCard'
              )
            }
            return quest.modifyState(p)
          }
        },
        progress: 0,
        endProgress: 1000
      }
    ]
  })
}
