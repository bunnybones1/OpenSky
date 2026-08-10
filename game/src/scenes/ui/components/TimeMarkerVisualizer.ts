import { renderMetrics } from '@opensky/shared/renderMetrics'

import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { TimeMark, TimeMarker } from '~/helpers/timeMarker'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

export default class TimeMarkerVisualizer {
  mesh: Mesh2D
  private _textOptions: textOptions.TextOptions
  constructor(private _timeMarker: TimeMarker) {
    this.mesh = new RectangleMesh(new RectangleMaterial({}))
    this._textOptions = {
      ...textOptions.debugText,
      width: renderMetrics.width - 20,
      align: 'left',
      vAlign: 'top',
      size: textOptions.debugText.size * 0.66
    }
    this.enable()
  }
  enable() {
    this._timeMarker.listenForMarkedTimes(this.onNewMarkedTime)
  }
  disable() {
    this._timeMarker.stopListeningForMarkedTimes(this.onNewMarkedTime)
  }
  onNewMarkedTime = (tm: TimeMark) => {
    const txt = new UITextMesh(tm.summary, this._textOptions)
    txt.matrix.setConstraints(
      undefined,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(10, 20 * this.mesh.children.length)
    )
    this.mesh.add(txt)
  }
}
