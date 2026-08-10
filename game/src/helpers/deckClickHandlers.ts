import { globalAccess } from '~/utils/globalAccess'

import { playSound } from './soundHelpers'

export const deckClickHandlers = {
  Player_Deck: () => {
    playSound('audioFxCommon', 'Click1')
    sidebarsContainer()?.playerDeckSidebar?.toggle()
  },
  Player_Graveyard: () => {
    playSound('audioFxCommon', 'Click1')
    sidebarsContainer()?.playerGraveyardSidebar?.toggle()
  },
  Opponent_Deck: () => {
    playSound('audioFxCommon', 'Error')
  },
  Opponent_Graveyard: () => {
    playSound('audioFxCommon', 'Click1')
    sidebarsContainer()?.opponentGraveyardSidebar?.toggle()
  }
}

const __verifyAllHandlers: {
  [K in `${'Opponent' | 'Player'}_${'Graveyard' | 'Deck'}`]: () => void
} = deckClickHandlers
void __verifyAllHandlers

function sidebarsContainer() {
  return globalAccess.ui?.getContainer('deckSidebars')
}
