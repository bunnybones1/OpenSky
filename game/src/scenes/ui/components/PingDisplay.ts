import {
  listenToPropertyDynamic,
  stopListeningToPropertyDynamic
} from '@opensky/shared/utils/propertyListeners'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DUSTY_PURPLE } from '~/colors/colorLibrary'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { store } from '~/state'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { createButtonIcon } from '~/utils/ui'

export default class PingDisplay {
  mesh: Object2D
  kill: () => void
  constructor() {
    this.mesh = new Object2D()
    this.mesh.name = 'ping-display'
    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-rounded-exterior'
    )
    backgroundMesh.matrix.setColor(COLOR_DUSTY_PURPLE, 0.5)
    this.mesh.add(backgroundMesh)
    createButtonIcon(
      this.mesh,
      'ui-icon-diagnostics',
      ReadonlyPin.Left.cloneOffset(12, 0)
    )
    const labelTextMesh = new UITextMesh('75ms', textOptions.diagnostics)
    labelTextMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(-4, -1)
    )
    this.mesh.add(labelTextMesh)
    const changeCallback = (ping: number) => {
      if (ping) {
        labelTextMesh.text = `${Math.ceil(ping)}ms`
      }
    }
    listenToPropertyDynamic(store, 'ping', changeCallback, true)
    this.kill = () => {
      stopListeningToPropertyDynamic(store, 'ping', changeCallback)
    }
  }
}
