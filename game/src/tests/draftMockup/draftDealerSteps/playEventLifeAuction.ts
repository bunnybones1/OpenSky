import {
  getNext,
  getRandom,
  removeFromArray,
  shuffleArray
} from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { DraftStateDebt } from '../DraftState'
import { EventStateLifeAuctionDealer } from '../EventStateLifeAuction'
import { getExampleBoons } from './exampleBoons'

export const playEventLifeAuction: DraftDealerStep = state => {
  if (state.dealerEventState instanceof EventStateLifeAuctionDealer) {
    const eventDealerState = state.dealerEventState
    const boonBidTracks = eventDealerState.boonBidTracks
    if (
      state.players.items.every(player =>
        boonBidTracks.items.some(bbt => bbt.player === player)
      )
    ) {
      for (const bbt of boonBidTracks.items) {
        bbt.player!.boons.add(bbt.boon)
        bbt.player!.boons.add(bbt.debts.items[bbt.debtIndex])
      }
      state.dealerEventState = undefined
      state.currentEvent = undefined
      return true
    }

    const currentPlayer = eventDealerState.activePlayer
    if (boonBidTracks.items.some(bbt => bbt.player === currentPlayer)) {
      eventDealerState.activePlayer = getNext(
        state.players.items,
        eventDealerState.activePlayer
      )
      return false
    }

    if (
      !boonBidTracks.items.some(bbt => bbt.player === currentPlayer) &&
      state.players.items.indexOf(currentPlayer) !== 0 &&
      Math.random() > 0.99
    ) {
      const remainingChoices = boonBidTracks.items
        .map(bbt => bbt.debts.items.slice(bbt.debtIndex + 1))
        .flat()
      if (remainingChoices.length > 0) {
        currentPlayer.currentCardChoice = getRandom(remainingChoices)
        currentPlayer.choiceCommited = true
      }
    }

    if (currentPlayer.currentCardChoice && currentPlayer.choiceCommited) {
      const preferredBoonBidTrack = boonBidTracks.items.find(b =>
        b.debts.items.includes(currentPlayer.currentCardChoice!)
      )
      if (preferredBoonBidTrack) {
        preferredBoonBidTrack.player = currentPlayer
        preferredBoonBidTrack.debtIndex =
          preferredBoonBidTrack.debts.items.indexOf(
            currentPlayer.currentCardChoice!
          )
        currentPlayer.currentCardChoice = undefined
        currentPlayer.choiceCommited = false
      } else {
        throw new Error('could not find preferred boon bid track')
      }
    }
  } else {
    if (!state.dealerEventState) {
      const eventState = new EventStateLifeAuctionDealer()
      eventState.activePlayer = getRandom(state.players.items)
      if (eventState.boons.length < state.players.length) {
        const boons = getExampleBoons()
        shuffleArray(boons)
        for (let i = 0; i < state.players.length; i++) {
          const boon = boons[i]
          removeFromArray(boons, boon)
          eventState.boons.add(boon)
          state.players.items[i].choiceCommited = false

          const boonBidTrack = eventState.boonBidTracks.items[i]
          const debts = [
            new DraftStateDebt(
              'Slow and Steady',
              'start the game with 0 less life'
            ),
            new DraftStateDebt(
              'Sprint Ahead',
              'start the game with 1 less life'
            ),
            new DraftStateDebt(
              'Quick and Daring',
              'start the game with 2 less life'
            ),
            new DraftStateDebt('Haste', 'start the game with 3 less life'),
            new DraftStateDebt(
              'Reckless Abandon',
              'start the game with 5 less life'
            )
          ]
          debts.forEach(debt => boonBidTrack.debts.add(debt))
        }
        state.dealerEventState = eventState
      } else {
        throw new Error('unexpected event state found during event')
      }
      return false
    }
  }
  return false
}
