import { clamp } from '@opensky/shared/utils/math'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DARK_BLUE_GRADIENT } from '~/colors/colorLibrary'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Frame } from '~/state/StateRecorder'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import inputProvider from '~/systems/input/input'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { toClipX } from '~/utils/camera'
import { makeInteractive } from '~/utils/makeInteractive'

const BG_COLOR = new Color(0x5e5e5e)
export const SLIDER_COLOR_PLAY = new Color(0xff3636)
export const SLIDER_COLOR_PAUSE = new Color(0xde7717)
const MOVE_COLOR: [Color, number] = [new Color(0xffffff), 0.5]
const MOVE_END_TURN_COLOR: [Color, number] = [new Color(0x000000), 1]
export default class ReplaySlider implements IInteractive {
  interacting = false
  container: Object2D
  cursor: CursorType = 'col-resize'
  hover: Object2D
  private _sliderColor: Color
  private _innerBarMesh: RectangleMesh
  get sliderColor(): Color {
    return this._sliderColor
  }
  set sliderColor(value: Color) {
    this._sliderColor = value
    this._innerBarMesh.matrix.setColor(this._sliderColor)
  }
  private ticks: Array<{
    mesh: RectangleMesh
    type: Frame['type']
    matchPercentTime: number
  }> = []
  hoverText: UITextMesh
  hovering: boolean
  constructor(
    public parameter: NiceFloatParameter,
    private timeFormat: (time: number) => string,
    private dragStart: () => void,
    private dragEnd: (newValue: number, slider: ReplaySlider) => void
  ) {
    const container = new Object2D()
    const backgroundMesh = new RectangleMesh(new RectangleMaterial({}))
    backgroundMesh.matrix.setColor(BG_COLOR)
    backgroundMesh.frustumCulled = false
    this._sliderColor = SLIDER_COLOR_PLAY
    const innerBarMesh = new RectangleMesh(new RectangleMaterial({}))
    innerBarMesh.matrix.setColor(this._sliderColor)
    const innerSize = new Pin(0, 1)
    innerBarMesh.matrix.setConstraints(
      innerSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    this._innerBarMesh = innerBarMesh

    makeInteractive(backgroundMesh, this)

    container.add(backgroundMesh)
    container.add(innerBarMesh)
    this.container = container

    parameter.listen(() => {
      const scale = this.parameter.distributedNormalizedValue
      innerSize.x.scale = scale
    })
    this.hover = new Object2D()
    this.hover.matrix.setConstraints(
      new Pin(0, 0, 50, 16),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, -30)
    )
    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-rounded-exterior'
    )
    bg.matrix.prescale.setScalar(5)
    bg.matrix.setColor(new Color('white'))
    this.hover.add(bg)
    this.hoverText = new UITextMesh('', {
      ...textOptions.replayTimeText,
      align: 'center',
      color: COLOR_DARK_BLUE_GRADIENT
    })
    this.hoverText.matrix.setConstraintsPosition(ReadonlyPin.Top)
    this.hover.add(this.hoverText)
    this.container.add(this.hover)
    inputProvider.onMove.addListener(this._updateHover)
    this.hover.visible = false
  }

  onOver() {
    this.hovering = true
  }

  onOut() {
    this.hovering = false
  }

  onSelect(x: number) {
    this._updateValue(x)
    this.dragEnd(this.parameter.value, this)
  }

  onDown(x: number) {
    this.onDragStart(x)
  }

  onDragStart(x: number) {
    if (!this.interacting) {
      this.interacting = true
      this._updateValue(x)
      inputProvider.onDrag.addListener(this.onDragMove)
      inputProvider.onPressEnd.addListener(this.onDragEnd)
      this.dragStart()
    }
  }

  private onDragEnd = () => {
    this.interacting = false
    inputProvider.onDrag.removeListener(this.onDragMove)
    inputProvider.onPressEnd.removeListener(this.onDragEnd)
    this.dragEnd(this.parameter.value, this)
  }

  private onDragMove = (x: number) => {
    this._updateValue(x)
  }

  private _updateValue(x: number) {
    const matEls = this.container.matrixWorld.elements
    this.parameter.distributedNormalizedValue = clamp(
      (toClipX(x) - matEls[2]) / matEls[0],
      0,
      1
    )
  }
  _updateHover = (x: number) => {
    this.hover.visible = this.hovering || this.interacting
    const matEls = this.container.matrixWorld.elements
    const xPercent = clamp((toClipX(x) - matEls[2]) / matEls[0], 0, 1)
    this.hover.matrix.offset.x.scale = xPercent
    this.hoverText.text = this.timeFormat(xPercent)
  }

  setTickMarks(
    moves: Array<{ matchPercentTime: number; type: Frame['type'] }>
  ) {
    this.ticks.forEach(tick => this.container.remove(tick.mesh))
    this.ticks = moves
      .filter(f => f.type !== 'internal')
      .map(({ matchPercentTime, type }) => {
        const ir = new RectangleMesh(new RectangleMaterial({}))

        ir.matrix.setColor(
          ...(type === 'playerActionEndTurn' ? MOVE_END_TURN_COLOR : MOVE_COLOR)
        )

        const innerSize = new Pin(0.0025, 1)
        ir.matrix.setConstraints(
          innerSize,
          ReadonlyPin.TopLeft,
          new Pin(matchPercentTime, 0)
        )

        this.container.add(ir)

        return { mesh: ir, type, matchPercentTime }
      })
  }
}
