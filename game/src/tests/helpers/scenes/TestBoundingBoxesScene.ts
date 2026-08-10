import {
  Box3Helper,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  SphereBufferGeometry
} from 'three'

import { COLOR_DEBUG_RED, COLOR_HIGHLIGHT_GREEN } from '~/colors/colorLibrary'
import queryParams from '~/queryParams'
import { FPSControls } from '~/utils/fpsControls'
import {
  ensureBoundsExist,
  getRelativeBounds,
  getRelativeBoundsSlow
} from '~/utils/meshUtils'
import { makeBox3Helper } from '~/utils/threeUtils'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

function makeBallMesh(size: number) {
  const halfSize = size * 0.5
  const basicMaterial = new MeshStandardMaterial({
    color: 0xddeeaa3,
    roughness: 0.5
  })
  const container = new Mesh(
    new SphereBufferGeometry(halfSize, 32, 16),
    basicMaterial
  )
  // sphere.position.x = -unitSize * 0.5
  container.position.y = halfSize
  container.name = 'Sphere'
  container.renderOrder = 1
  return container
}

class TestBoundingBoxesScene extends BaseTestScene {
  unitSize: number
  container: Mesh
  constructor() {
    super()
    addPrettyLights(this.scene, this.bgColor)
    const fps = new FPSControls(this.camera as PerspectiveCamera)
    if (queryParams.fpsCam) {
      fps.toggle(true)
    }

    const unitSize = 0.12

    const test = makeBallMesh(unitSize)
    test.rotation.x = Math.PI * -0.2
    test.position.set(-0.1, -0.05, 0)
    this.scene.add(test)
    const test2 = makeBallMesh(unitSize * 0.5)
    test.add(test2)
    test2.position.x = unitSize * 0.7
    test2.rotation.y = Math.PI * 0.2
    test2.rotation.z = Math.PI * 0.2
    const test3 = makeBallMesh(unitSize * 0.3)
    test3.position.z = unitSize * 1.7
    test3.scale.z = 0.1
    test3.position.x = unitSize * 0.7
    test2.add(test3)
    const test4 = makeBallMesh(unitSize * 0.3)
    test4.position.z = unitSize * 1.27
    test4.scale.z = 0.1
    test4.position.x = unitSize * -0.7
    test4.rotation.x = Math.PI * -0.2
    test2.add(test4)
    this.container = test
    this.unitSize = unitSize
    test.updateMatrixWorld(true)
    ensureBoundsExist(test)

    const helpThese: Object3D[] = []
    test.traverse(node => {
      helpThese.push(node)
    })
    const set1: Box3Helper[] = []
    const set2: Box3Helper[] = []
    const sets = [set1, set2]
    for (const pair of [
      [getRelativeBounds, set1],
      [getRelativeBoundsSlow, set2]
    ] as const) {
      for (const node of helpThese) {
        const bb2 = pair[0](node, true)
        const bbHelper2 = makeBox3Helper(bb2, COLOR_DEBUG_RED)
        node.add(bbHelper2)
        pair[1].push(bbHelper2)
        const bb = pair[0](node, false)
        const bbHelper = makeBox3Helper(bb, COLOR_HIGHLIGHT_GREEN)
        node.add(bbHelper)
        pair[1].push(bbHelper)
      }
    }
    let i = 0
    setInterval(() => {
      for (const bb of sets[i % 2]) {
        bb.visible = false
      }
      i++
      for (const bb of sets[i % 2]) {
        bb.visible = true
      }
    }, 100)
  }
}
export const scene = TestBoundingBoxesScene
