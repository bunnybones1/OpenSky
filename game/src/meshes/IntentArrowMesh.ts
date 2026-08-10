import device from '@opensky/shared/device'
import { BufferGeometry, Mesh, Object3D, Vector3 } from 'three'

import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'

const __tempVec3 = new Vector3()

const LENGTH_OF_MODELLED_GEOMETRY: number = 0.108
export class IntentArrowMesh extends Object3D {
  set length(value: number) {
    this._arrow.position.z = value
    this.material.uniforms.lengthRatio.value =
      value - LENGTH_OF_MODELLED_GEOMETRY
  }
  source: Object3D | undefined
  private _protectingMatrix = false
  private _arrow: Mesh
  constructor(
    geometry: BufferGeometry,
    public material: MagicFireHighlightMeshMaterial
  ) {
    super()
    this._arrow = new Mesh(geometry, material)
    this._arrow.frustumCulled = false
    this.add(this._arrow)
    this._arrow.rotation.y = Math.PI
    this.material = material as MagicFireHighlightMeshMaterial
    if (device.isMobile) {
      this.scale.set(1.5, 1, 1)
    }
  }
  updateMatrix() {
    if (!this._protectingMatrix && this.source && this.source.parent) {
      this._protectingMatrix = true
      __tempVec3.set(0, -0.01, -0.02).applyMatrix4(this.source.matrixWorld)
      this.source.parent.localToWorld(__tempVec3)
      this.lookAt(__tempVec3)
      this._protectingMatrix = false
      const distance = this.position.distanceTo(__tempVec3)
      this.length = distance
    }
    super.updateMatrix()
  }
}
