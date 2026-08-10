import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class GameContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'game', {
      priority
    })
  }

  protected async init() {
    // const vialMargin = 8
    // const s = 90
    // const vialSize = new Pin(0, 0, s, s)
    // const playerManaTracker = makeVial(matchInfoStore.playerInfo, false)
    // playerManaTracker.uiPivot.matrix.setConstraints(
    //   vialSize,
    //   ReadonlyPin.BottomLeft,
    //   ReadonlyPin.BottomLeft.cloneOffset(vialMargin, -vialSize.x.offset / 2)
    // )
    // playerContainer.add(playerManaTracker.uiPivot)
    // const opponentManaTracker = makeVial(matchInfoStore.opponentInfo, true)
    // opponentManaTracker.uiPivot.matrix.setConstraints(
    //   vialSize,
    //   ReadonlyPin.TopLeft,
    //   ReadonlyPin.TopLeft.cloneOffset(vialMargin, SKYTAG_HEIGHT)
    // )
    // opponentContainer.add(opponentManaTracker.uiPivot)
  }
}
