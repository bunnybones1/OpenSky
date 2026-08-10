import { Vector3 } from 'three'

import { OwnedCardStatus } from '~/types'

interface DeckConfigDesktop {
  pos: Vector3
}

const decksX = 0.3
const bump = 0.0035
const playerDecksZ = 0.0515
const opponentDecksZ = -0.098

const deckY = -0.005
const deckZ = 0.00475

export const deckConfigs: Map<OwnedCardStatus, DeckConfigDesktop> = new Map([
  [
    'Player_Deck',
    {
      pos: new Vector3(decksX, deckY, playerDecksZ - bump + deckZ)
    }
  ],
  [
    'Player_Graveyard',
    {
      pos: new Vector3(-decksX, deckY, playerDecksZ + bump)
    }
  ],
  [
    'Opponent_Deck',
    {
      pos: new Vector3(decksX, deckY, opponentDecksZ - bump + deckZ)
    }
  ],
  [
    'Opponent_Graveyard',
    {
      pos: new Vector3(-decksX, deckY, opponentDecksZ + bump)
    }
  ]
])
