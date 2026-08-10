import { getAssetsManager } from '~/assets/index'
import { PALETTE_ROW } from '~/constants'
import { ButtonHighlightShape, ButtonShape } from '~/helpers/buttonTypeHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'

import BaseButton, { ButtonHighlightStyle, ButtonState } from './BaseButton'

const buttonPaletteOffsets: { [K in ButtonState]: number } = {
  [ButtonState.Normal]: 0,
  [ButtonState.Hover]: 1,
  [ButtonState.Click]: 2,
  [ButtonState.Selected]: 2,
  [ButtonState.Disabled]: 3
}
export default class PaletteMappedButton extends BaseButton {
  mesh: Omit<Mesh2D, 'material'> & {
    material: PaletteMappedVertexColorMeshMaterial
  }
  constructor(
    onSelect: () => void,
    private _basePaletteRow: PALETTE_ROW = 0,
    shape: ButtonShape = 'button-diagonal',
    useFancyHighlight: boolean = false,
    hasTurnTimer: boolean = false,
    buttonHighlightStyle: ButtonHighlightStyle = 'buttonBasic'
  ) {
    super(
      getAssetsManager().fetchMeshDeepClone('uiSmall', shape, undefined, true),
      onSelect,
      `${shape}${
        hasTurnTimer ? '-with-timer' : ''
      }-highlight` as unknown as ButtonHighlightShape,
      buttonHighlightStyle
    )
    const mesh = this.mesh
    mesh.material = mesh.material.variant({
      useFancyHighlight
    })
    this.setState(0)
  }

  setState(state: ButtonState) {
    super.setState(state)
    this._updateVisuals()
  }

  set basePaletteRow(val: PALETTE_ROW) {
    this._basePaletteRow = val
    this._updateVisuals()
  }
  get basePaletteRow(): PALETTE_ROW {
    return this._basePaletteRow
  }

  private _updateVisuals() {
    if (this.mesh.material instanceof PaletteMappedVertexColorMeshMaterial) {
      this.mesh.material.paletteRow =
        this._basePaletteRow + buttonPaletteOffsets[this.state]
    }
  }
}
