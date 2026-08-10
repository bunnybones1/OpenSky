import { middleOut2 } from '@opensky/shared/utils/math'
import { Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import TransformComponent from '~/components/TransformComponent'
import { debuggables, getCurrentDebugPath } from '~/debug/debugRegistry'
import { scene } from '~/scenes/arena/scene'
import UpdateManager from '~/systems/UpdateManager'
import BasicIslandTest from '~/tests/BasicIslandTest'
import MaterialTestGeometryHelper from '~/utils/helpers/MaterialTestGeometryHelper'
import { modify3DObjectsWhoseNamesInclude } from '~/utils/threeUtils'

async function testLightCacheCards() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  TransformComponent.defaultScene = scene
  const cardsNode = await getAssetsManager().loadAsset('gamePiecesPhysical')

  modify3DObjectsWhoseNamesInclude<Mesh>(
    cardsNode,
    '-highlight',
    mesh => (mesh.visible = false)
  )

  let c = 0
  const curatedNode = new Object3D()
  const curatedNames = [
    'unit',
    'guard',
    'attached-enchantment',
    'attached-spell',
    'card',
    'trigger-icons-1-frame-base',
    'trigger-icons-2-frame-base',
    'trigger-icons-1-frame-silver',
    'trigger-icons-2-frame-silver',
    'trigger-icons-1-frame-gold',
    'trigger-icons-2-frame-gold',
    'hero'
  ]

  const restrictedNames = [
    'base',
    // 'silver',
    'gold',
    // 'private',
    'public',
    'shine'
  ]

  curatedNode.scale.multiplyScalar(1.6)
  for (let i = cardsNode.children.length - 1; i >= 0; i--) {
    const child = cardsNode.children[i]
    if (curatedNames.includes(child.name)) {
      c++
      child.rotation.x += Math.PI * 0.3
      child.position.y = 0.05
      child.position.z = 0
      curatedNode.add(child)
      for (let j = child.children.length - 1; j >= 0; j--) {
        for (const restrictedName of restrictedNames) {
          if (child.children[j].name.includes(restrictedName)) {
            child.remove(child.children[j])
            break
          }
        }
      }
    }
    let prismCounter = 0
    for (const subChild of child.children) {
      if (subChild.name.includes('prism')) {
        const coords = middleOut2(prismCounter, 3)
        subChild.position.x += coords[0] * 0.01
        subChild.position.z += coords[1] * 0.01
        subChild.position.y += 0.005
        prismCounter++
      }
    }
  }
  c++
  for (const child of curatedNode.children) {
    child.position.x = (curatedNames.indexOf(child.name) - c * 0.5) * 0.05
  }
  curatedNode.traverse(n => console.log(n.name))
  UpdateManager.register({
    update: (dt: number) => {
      for (const child of curatedNode.children) {
        child.rotation.z += Math.PI * 0.125 * dt
      }
    }
  })

  scene.add(curatedNode)

  const geoHelper = new MaterialTestGeometryHelper(scene)
  UpdateManager.register(geoHelper)

  debuggables.setActivePath(getCurrentDebugPath(), true)
}

export const test = testLightCacheCards
