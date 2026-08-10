import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import { UI } from '.'

function createErrorModal(
  parent: Object2D,
  text: string,
  width: number = 100,
  height: number = 40
) {
  const boxMesh = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'info-box',
    true,
    true
  )
  parent.add(boxMesh)
  boxMesh.matrix.setConstraints(Pin.fromPixels(width, height))

  const textMesh = new UITextMesh(text, textOptions.speechBubbleText)
  textMesh.matrix.setConstraintsPosition(ReadonlyPin.Center)
  boxMesh.add(textMesh)
  return boxMesh
}

export default class ErrorManager {
  collection: Set<Object2D> = new Set()
  constructor(private _ui: UI) {
    //
  }

  async create(text: string) {
    await this.destroyAll()

    const errorModal = createErrorModal(
      this._ui.getContainer('errors'),
      text,
      400,
      250
    )

    this.collection.add(errorModal)

    await this._ui.getContainer('errors').show()

    return errorModal
  }

  async destroyAll() {
    const errorsContainer = this._ui.getContainer('errors')
    await errorsContainer.ready
    await errorsContainer.hide()
    this.collection.forEach(speechBubble => {
      errorsContainer.remove(speechBubble)
    })
    this.collection.clear()
  }
}
