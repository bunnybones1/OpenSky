import { BufferGeometry, Color, Mesh } from 'three'

import { attachMagicCube } from '~/helpers/attachMagicCube'
import { WorldPointObject3D } from '~/helpers/WorldPointObject3D'
import BasicVertexColorMeshMaterial from '~/materials/BasicVertexColorMeshMaterial'
import { simpleTweener } from '~/systems/animation/tweeners'
import TextMesh from '~/systems/text/TextMesh'
import { dealerBrainPhaseLabel } from '~/systems/text/TextOptions'

const COLOR_ACTIVE = new Color(0.8, 1.5, 0.8)
const COLOR_PASSIVE = new Color(0.4, 0.25, 0.5)
export default class DelearPhaseMarker extends WorldPointObject3D {
  private _active: boolean
  private _cube: Mesh<BufferGeometry, BasicVertexColorMeshMaterial>
  get active(): boolean {
    return this._active
  }
  set active(value: boolean) {
    if (this._active === value || !this._cube) {
      return
    }
    this._active = value
    const targetColor = value ? COLOR_ACTIVE : COLOR_PASSIVE
    simpleTweener.to({
      description: 'animate color',
      target: this._cube.material.color,
      propertyGoals: { r: targetColor.r, g: targetColor.g, b: targetColor.b },
      duration: value ? 0 : 500
    })
  }
  constructor(labelStr: string) {
    super()
    attachMagicCube(this).then(cube => {
      cube.material.color = (
        this._active ? COLOR_ACTIVE : COLOR_PASSIVE
      ).clone()
      // cube.material.color.copy(0.1, 0.2, 0.3)
      cube.rotation.z = Math.PI * 0.5
      cube.scale.multiplyScalar(0.9)
      this._cube = cube
    })

    const label = new TextMesh(
      labelStr,
      dealerBrainPhaseLabel,
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    label.renderOrder = 10000
    label.rotateX(Math.PI * -0.5)
    this.add(label)
  }
}
