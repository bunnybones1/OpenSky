import { CardLibrary } from '@skyweaver/state-metadata'
import produce from 'immer'
import { instantOneTimeEvent } from 'src'
import { and, constructedDeckMatches, gameWin } from 'src/questHelpers'
import { mockGameEndSecret, mockGameEndState } from 'tests/mock'
import { buildQuestHelper } from 'tests/questHelpers.test'
import { describe, expect, test } from 'vitest'

describe('deckAtGameStart helper', () => {
  const quest = instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const meta = CardLibrary.get(c)
          if (!meta) {
            return false
          }
          return typeof meta.cost !== 'number' || meta.cost >= 4
        })
      )
    )
  )
  test('deck at game start matches positive', () => {
    const gameEndState = produce(mockGameEndState, g => {
      g.state.status = {
        type: 'GameOver',
        winner: 0
      }
    })
    const secret = produce(mockGameEndSecret, s => {
      s.secret.originalDeck = [
        '2104', // expensive card
        '2104', // expensive card
        '2104', // expensive card
        '2104' // expensive card
      ]
    })

    const qm = buildQuestHelper(quest)
    qm.onStateUpdated(gameEndState, secret, secret)
    expect(qm.getProgressThisMatch()[0]).toBe(1)
  })
  test('deck at game doesnt match negative', () => {
    const gameEndState = produce(mockGameEndState, g => {
      g.state.status = {
        type: 'GameOver',
        winner: 0
      }
    })
    const secret = produce(mockGameEndSecret, s => {
      s.secret.originalDeck = [
        '2',
        '27',
        '29',
        '36',
        '39',
        '45',
        '46',
        '55',
        '58',
        '72',
        '81',
        '84',
        '88',
        '89',
        '90',
        '106',
        '109',
        '114',
        '116',
        '117',
        '120',
        '124',
        '126',
        '129',
        '130'
      ]
    })

    const qm = buildQuestHelper(quest)
    qm.onStateUpdated(gameEndState, secret, secret)
    expect(qm.getProgressThisMatch()[0]).toBe(0)
  })
})
