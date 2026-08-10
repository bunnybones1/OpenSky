import { GameMode } from '@opensky/proto'

import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { gameMode } from '~/helpers/envGameModeHelpers'
import { store } from '~/state/index'
import { getTutorial } from '~/tutorial/Tutorial'

export function getPrismsForCard(card: RelaxedCardInstance, owner: number) {
  let prisms = [card.state.view.prism]
  if (gameMode === GameMode.TUTORIAL && card.state.view.prism === 'tut') {
    const setup = getTutorial()?.config.setup
    if (typeof setup !== 'string') {
      const myState = setup[owner === store.player ? 'player' : 'enemy']
      if (myState?.prisms) {
        prisms = myState.prisms
      }
    }
  }
  return prisms
}
