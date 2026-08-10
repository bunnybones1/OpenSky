import {
  BoxBufferGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  SphereBufferGeometry
} from 'three'

import { hues } from '~/colors/colorHues'
import { makeHSL } from '~/colors/utils'
import ToolTip from '~/compoundMeshes/ToolTip'
import queryParams from '~/queryParams'
import { animationDelay } from '~/utils/asyncUtils'
import { FPSControls } from '~/utils/fpsControls'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { taskTimer } from '~/utils/taskTimer'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

class TestToolTipsScene extends BaseTestScene {
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
      const floor = new Mesh(getSharedPlaneBufferGeometry(), basicMaterial)
      floor.castShadow = false
      floor.receiveShadow = true
      this.scene.add(floor)
      floor.rotation.x = Math.PI * -0.5
      const sphere = new Mesh(
        new SphereBufferGeometry(radius, 32, 16),
        basicMaterial
      )
      sphere.castShadow = true
      sphere.receiveShadow = true
      sphere.position.x = -unitSize * 0.5
      sphere.position.y = radius
      sphere.name = 'Sphere'
      this.scene.add(sphere)
      const box = new Mesh(
        new BoxBufferGeometry(unitSize, unitSize, unitSize),
        basicMaterial
      )
      box.castShadow = true
      box.receiveShadow = true
      box.position.x = unitSize * 0.5
      box.position.y = radius
      box.name = 'Cube'
      this.scene.add(box)

      await animationDelay(2000)

      const color = makeHSL(hues._12_coolCyan, 0.8, 0.5)
      const sharedParams = {
        color,
        constantSizeOnScreen: true
      }
      ;[sphere, box].forEach((obj, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const tip = new ToolTip(obj.name, {
          ...sharedParams,
          side
        })
        taskTimer.add(() => {
          tip.hideAndDispose()
        }, 3)
        obj.add(tip)
      })
    }
    init()
  }
}
export const scene = TestToolTipsScene
