import { Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three'

import queryParams from '~/queryParams'
import { FPSControls } from '~/utils/fpsControls'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

class TestBooleanMeshesScene extends BaseTestScene {
  waterline: Mesh
  unitSize: number
  container: Mesh
  constructor() {
    super()
    addPrettyLights(this.scene, this.bgColor)
    const fps = new FPSControls(this.camera as PerspectiveCamera)
    if (queryParams.fpsCam) {
      fps.toggle(true)
    }

    const unitSize = 0.06
    const floorMaterial = new MeshStandardMaterial({
      color: 0xaaddee,
      roughness: 0.7
    })
    const floor = new Mesh(getSharedPlaneBufferGeometry(), floorMaterial)
    floor.renderOrder = 0
    this.scene.add(floor)
    floor.rotation.x = Math.PI * -0.5

    //boolean geometry is neat but not worth the complexity

    this.unitSize = unitSize
  }
  update(dt: number) {
    if (this.waterline) {
      this.waterline.position.y =
        Math.sin(performance.now() * 0.001) * this.unitSize * 0.5
    }
    if (this.container) {
      this.container.rotation.y = performance.now() * 0.001
      this.container.rotation.z = Math.sin(performance.now() * 0.005) * 0.2
    }
    super.update(dt)
  }
}
export const scene = TestBooleanMeshesScene
