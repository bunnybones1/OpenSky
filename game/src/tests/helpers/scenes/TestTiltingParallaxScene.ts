import {
  BoxBufferGeometry,
  ConeBufferGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion
} from 'three'

import queryParams from '~/queryParams'
import parallaxInput, {
  SoftQuaternionListener
} from '~/systems/input/parallaxInput'
import { parallaxStrength } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'
import { FPSControls } from '~/utils/fpsControls'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

class TestTiltingParallaxScene extends BaseTestScene {
  private box: Mesh
  constructor() {
    super()
    addPrettyLights(this.scene, this.bgColor)
    const fps = new FPSControls(this.camera as PerspectiveCamera)
    if (queryParams.fpsCam) {
      fps.toggle(true)
    }
    const init = async () => {
      const unitSize = 0.06
      const radius = unitSize * 0.5
      const basicMaterial = new MeshStandardMaterial({
        color: 0xaaddee,
        roughness: 0.7
      })
      const box = new Mesh(
        new BoxBufferGeometry(unitSize, unitSize, unitSize),
        basicMaterial
      )
      box.castShadow = true
      box.receiveShadow = true
      box.position.y = radius
      box.name = 'Cube'
      this.scene.add(box)

      const forwardCone = new Mesh(
        new ConeBufferGeometry(radius * 0.5, unitSize * 0.5, 12, 1, true),
        basicMaterial
      )
      box.add(forwardCone)
      forwardCone.position.z = unitSize * 0.75
      forwardCone.rotation.x = Math.PI * 0.5
      forwardCone.castShadow = true
      forwardCone.receiveShadow = true

      this.box = box

      let softParallax: SoftQuaternionListener | undefined
      parallaxStrength.listen(s => {
        const shouldUseParallax = s > 0
        if (softParallax && !shouldUseParallax) {
          softParallax = undefined
          parallaxInput.removeListener(this.onParallax)
        } else if (!softParallax && shouldUseParallax) {
          softParallax = parallaxInput.addListener(this.onParallax, -s)
        } else if (softParallax) {
          softParallax.strength = -s
        }
      })

      await animationDelay(2000)
    }
    init()
  }
  onParallax = (quaternion: Quaternion) => {
    this.box.quaternion.copy(quaternion)
    // box.position.x = Math.random() * 0.01
  }
  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestTiltingParallaxScene
