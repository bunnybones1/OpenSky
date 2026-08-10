import { GameMode, Hero } from '@opensky/proto'
import { produce } from 'immer'
import { describe, expect, test } from 'vitest'

import {
  accumulated,
  instantOneTimeEvent,
  oneTimeEvent,
  PlayerQuestManager
} from '..'
import {
  gameDraw,
  gameEndedWithoutProgressFrom,
  gameFinish,
  gameLose,
  gameWin
} from '../src/questHelpers'
import { mockGameEndSecret, mockGameEndState } from './mock'

describe('PlayerQuestManager', () => {
  describe('basics', () => {
    test('no quests', () => {
      new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: []
      })
    })
  })

  describe('game end', () => {
    test('game ended', () => {
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: instantOneTimeEvent(gameFinish)
          }
        ]
      })
      qm.onStateUpdated(mockGameEndState, mockGameEndSecret, mockGameEndSecret)
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
    })

    test('game won', () => {
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: instantOneTimeEvent(gameWin)
          }
        ]
      })
      qm.onStateUpdated(mockGameEndState, mockGameEndSecret, mockGameEndSecret)
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
    })

    test('game not won fails', () => {
      const endState = produce(mockGameEndState, state => {
        state.state.status = {
          type: 'GameOver',
          winner: 1
        }
      })

      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: instantOneTimeEvent(gameWin)
          }
        ]
      })
      qm.onStateUpdated(endState, mockGameEndSecret, mockGameEndSecret)
      expect(qm.getProgressThisMatch()[1234]).toBe(0)
    })

    test('game lost', () => {
      const gameEndState = produce(mockGameEndState, g => {
        g.state.status = {
          type: 'GameOver',
          winner: 1
        }
      })
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: instantOneTimeEvent(gameLose)
          }
        ]
      })
      qm.onStateUpdated(gameEndState, mockGameEndSecret, mockGameEndSecret)
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
    })

    test('game draw', () => {
      const gameEndState = produce(mockGameEndState, g => {
        g.state.status = {
          type: 'GameOver',
          winner: undefined
        }
      })
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: instantOneTimeEvent(gameDraw)
          }
        ]
      })
      qm.onStateUpdated(gameEndState, mockGameEndSecret, mockGameEndSecret)
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
    })

    describe('must be triggered condition', () => {
      test('not fired fails', () => {
        const qm = new PlayerQuestManager({
          deck: [],
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: Hero.UNKNOWN,
          player: 0,
          quests: [
            {
              id: 1234,
              progress: 0,
              endProgress: 10,
              impl: instantOneTimeEvent(({ eventsThisAction }) => {
                const e = eventsThisAction[eventsThisAction.length - 1]
                return (
                  e &&
                  e.type === 'GameEvent' &&
                  e.payload.event.type === 'FinishCardResolution'
                )
              })
            }
          ]
        })
        qm.onStateUpdated(
          mockGameEndState,
          mockGameEndSecret,
          mockGameEndSecret
        )
        expect(qm.getProgressThisMatch()[1234]).toBe(0)
      })

      test('fired succeeds', () => {
        const qm = new PlayerQuestManager({
          deck: [],
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: Hero.UNKNOWN,
          player: 0,
          quests: [
            {
              id: 1234,
              progress: 0,
              endProgress: 10,
              impl: instantOneTimeEvent(({ eventsThisAction }) => {
                const e = eventsThisAction[eventsThisAction.length - 1]
                return (
                  e.type === 'GameEvent' &&
                  e.payload.event.type === 'FinishCardResolution'
                )
              })
            }
          ]
        })
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        qm.onStateUpdated(
          mockGameEndState,
          mockGameEndSecret,
          mockGameEndSecret
        )
        expect(qm.getProgressThisMatch()[1234]).toBe(1)
      })

      test('fired extra times succeeds', () => {
        const qm = new PlayerQuestManager({
          deck: [],
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: Hero.UNKNOWN,
          player: 0,
          quests: [
            {
              id: 1234,
              progress: 0,
              endProgress: 10,
              impl: instantOneTimeEvent(({ eventsThisAction }) => {
                const e = eventsThisAction[eventsThisAction.length - 1]
                return (
                  e.type === 'GameEvent' &&
                  e.payload.event.type === 'FinishCardResolution'
                )
              })
            }
          ]
        })
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        qm.onStateUpdated(
          mockGameEndState,
          mockGameEndSecret,
          mockGameEndSecret
        )
        expect(qm.getProgressThisMatch()[1234]).toBe(1)
      })
    })
    describe('must NOT be triggered condition', () => {
      test('if fired, fails', () => {
        const qm = new PlayerQuestManager({
          deck: [],
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: Hero.UNKNOWN,
          player: 0,
          quests: [
            {
              id: 1234,
              progress: 0,
              endProgress: 10,
              impl: gameEndedWithoutProgressFrom(
                instantOneTimeEvent(({ eventsThisAction }) => {
                  const e = eventsThisAction[eventsThisAction.length - 1]
                  return (
                    e.type === 'GameEvent' &&
                    e.payload.event.type === 'FinishCardResolution'
                  )
                })
              )
            }
          ]
        })

        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        qm.onStateUpdated(
          mockGameEndState,
          mockGameEndSecret,
          mockGameEndSecret
        )
        expect(qm.getProgressThisMatch()[1234]).toBe(0)
      })

      test('if NOT fired, succeeds', () => {
        const qm = new PlayerQuestManager({
          deck: [],
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: Hero.UNKNOWN,
          player: 0,
          quests: [
            {
              id: 1234,
              progress: 0,
              endProgress: 10,
              impl: gameEndedWithoutProgressFrom(
                instantOneTimeEvent(({ eventsThisAction }) => {
                  const e = eventsThisAction[eventsThisAction.length - 1]
                  return (
                    e.type === 'GameEvent' &&
                    e.payload.event.type === 'FinishCardResolution'
                  )
                })
              )
            }
          ]
        })
        qm.onStateUpdated(
          mockGameEndState,
          mockGameEndSecret,
          mockGameEndSecret
        )
        expect(qm.getProgressThisMatch()[1234]).toBe(1)
      })

      test('if fired extra times fails', () => {
        const qm = new PlayerQuestManager({
          deck: [],
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: Hero.UNKNOWN,
          player: 0,
          quests: [
            {
              id: 1234,
              progress: 0,
              endProgress: 10,
              impl: gameEndedWithoutProgressFrom(
                instantOneTimeEvent(({ eventsThisAction }) => {
                  const e = eventsThisAction[eventsThisAction.length - 1]
                  return (
                    e.type === 'GameEvent' &&
                    e.payload.event.type === 'FinishCardResolution'
                  )
                })
              )
            }
          ]
        })
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        qm.onStateUpdated(
          mockGameEndState,
          mockGameEndSecret,
          mockGameEndSecret
        )
        expect(qm.getProgressThisMatch()[1234]).toBe(0)
      })
    })
  })

  describe('instant events', () => {
    test("oneshot fires, progress doesn't exceed one", () => {
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: instantOneTimeEvent(({ eventsThisAction }) => {
              const e = eventsThisAction[eventsThisAction.length - 1]
              return (
                e.type === 'GameEvent' &&
                e.payload.event.type === 'FinishCardResolution'
              )
            })
          }
        ]
      })

      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
      expect(qm.getProgressThisMatch()[1234]).toBe(1)

      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
    })

    test("stateful fires, progress doesn't exceed one", () => {
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 0,
            endProgress: 10,
            impl: oneTimeEvent({
              initState: () => 0,
              modifyState({ state }) {
                return state + 1
              },
              done: state => state > 5
            })
          }
        ]
      })

      for (let i = 0; i < 5; i++) {
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        expect(qm.getProgressThisMatch()[1234]).toBe(0)
      }
      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
      qm.onProcessEvent({
        type: 'GameEvent',
        payload: {
          event: {
            type: 'FinishCardResolution'
          }
        }
      })
      expect(qm.getProgressThisMatch()[1234]).toBe(1)
    })

    test('accumulator accumulates', () => {
      const qm = new PlayerQuestManager({
        deck: [],
        gameMode: GameMode.RANKED_CONSTRUCTED,
        hero: Hero.UNKNOWN,
        player: 0,
        quests: [
          {
            id: 1234,
            progress: 2,
            endProgress: 100,
            impl: accumulated(() => 2)
          }
        ]
      })

      for (let i = 0; i < 5; i++) {
        qm.onProcessEvent({
          type: 'GameEvent',
          payload: {
            event: {
              type: 'FinishCardResolution'
            }
          }
        })
        expect(qm.getProgressThisMatch()[1234]).toBe((i + 1) * 2)
      }
    })
  })
})
