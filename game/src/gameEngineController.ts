import device from '@opensky/shared/device'
import { GameEngineController } from '@opensky/shared/GameEngineController'
import renderController from '@opensky/shared/renderController'
import { BaseCard, Rarity } from '@skyweaver/state-metadata'

import renderer from './renderer'
let isTrackingCanvasSize = false
let lastCardId: BaseCard = '1'
let lastRarity: Rarity = 'base'
const cardChangeListeners: Array<(id: BaseCard, rarity: Rarity) => void> = []
export const gameEngineController: GameEngineController = {
  getCanvas() {
    return renderer.getContext().canvas as HTMLCanvasElement
  },
  startTrackingCanvasSize() {
    if (!isTrackingCanvasSize) {
      isTrackingCanvasSize = true
      device.trackCanvas(this.getCanvas())
    }
  },
  listenForCardChange(cb: (id: BaseCard, rarity: Rarity) => void) {
    cb(lastCardId, lastRarity)
    cardChangeListeners.push(cb)
  },
  showCard(id: BaseCard, rarity: Rarity) {
    lastCardId = id
    lastRarity = rarity
    for (const cb of cardChangeListeners) {
      cb(id, rarity)
    }
  },
  pause() {
    renderController.active = false
  },
  resume() {
    renderController.active = true
  }
}

window.swGameEngineController = gameEngineController
