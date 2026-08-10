import {
  getRandom,
  removeFromArray,
  shuffleArray
} from '@opensky/shared/utils/arrayUtils'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { DraftDealerStep } from '../dealerStepTypes'
import { draftSettings } from '../draftSettings'
import { DraftStateBoon, DraftStateCard } from '../DraftState'
import { EventStateBoonChoiceDealer } from '../EventStateBoonChoice'
import { getExampleBoons } from './exampleBoons'
import { moveRandomItem } from './utils'

export const playEventBoonChoice: DraftDealerStep = state => {
  if (state.dealerEventState instanceof EventStateBoonChoiceDealer) {
    if (
      state.players.items.every(
        player => player.currentCardChoice && player.choiceCommited
      )
    ) {
      for (const player of state.players.items) {
        const chosenBoon = player.currentCardChoice!
        const choices = player.currentCardPack!
        player.boons.add(chosenBoon)
        choices.remove(chosenBoon)
        while (choices.length > 0) {
          const boon = getRandom(choices.items)
          choices.remove(boon)
          state.trashCards.add(boon)
          state.trashCards.remove(boon)
          getExampleBoons().push(boon as DraftStateBoon)
        }
        state.trashCardPacks.add(choices)
        player.currentCardPack = undefined
        player.currentCardChoice = undefined
        player.choiceCommited = false
      }
      state.dealerEventState = undefined
      state.currentEvent = undefined
      return true
    }

    for (const player of state.players.items) {
      if (
        state.players.items.indexOf(player) !== 0 &&
        Math.random() > 0.99 &&
        player.currentCardPack
      ) {
        player.currentCardChoice = getRandom(player.currentCardPack.items)
        player.choiceCommited = true
      }
    }
  } else {
    if (!state.dealerEventState) {
      const eventState = new EventStateBoonChoiceDealer()
      const total =
        state.players.length * draftSettings.boonChoiceBoonsPerPlayer
      const boons = getExampleBoons()
      shuffleArray(boons)
      while (eventState.boons.length < total) {
        const boon = getRandom(boons)
        removeFromArray(boons, boon)
        eventState.boons.add(boon)
      }
      for (const player of state.players.items) {
        TrackableCollection.unlock()
        const boonPack = new TrackableCollection<DraftStateCard>(
          'boon pack for ' + player.name
        )
        TrackableCollection.lock()
        for (let i = 0; i < draftSettings.boonChoiceBoonsPerPlayer; i++) {
          moveRandomItem(eventState.boons, boonPack)
        }
        player.currentCardPack = boonPack
        player.currentCardChoice = undefined
        player.choiceCommited = false
      }
      state.dealerEventState = eventState
      return false
    }
    return false
  }
  return false
}
