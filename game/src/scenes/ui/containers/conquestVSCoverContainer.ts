import { isDiscoveryGame } from '~/helpers/envGameModeHelpers'
import { Pin, SizePin } from '~/helpers/LayoutHelpers'
import { makeInteractive } from '~/utils/makeInteractive'

import { UI } from '..'
import {
  ConquestVSBackgrounds,
  createConquestVSBackgrounds
} from '../components/ConquestVSBackgrounds'
import UIContainer from '../components/UIContainer'

export default class ConquestVSCoverContainer extends UIContainer {
  private _conquestBackground: ConquestVSBackgrounds
  constructor(ui: UI, priority: number) {
    super(ui, 'conquestVSCover', {
      priority
    })
  }
  protected async init() {
    const conquestBG = await createConquestVSBackgrounds(
      isDiscoveryGame ? 'discovery' : 'constructed'
    )
    const mesh = conquestBG.mesh
    // mesh.position.z = -10
    mesh.matrix.setConstraints(
      new SizePin(1, 1, 1920 / 1080, 'crop'),
      new Pin(0.5, 0.2),
      new Pin(0.5, 0.2)
    )

    makeInteractive(mesh, {
      cursor: 'default'
    })

    this.add(mesh)
    this._conquestBackground = conquestBG
  }
  setGame(game: 0 | 1 | 2) {
    this._conquestBackground.setGame(game)
  }
}
