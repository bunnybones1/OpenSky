import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D
} from 'three'

import { COLOR_BLACK } from '~/colors/colorLibrary'
import materialLibrary from '~/materials/library'
import { testOverdraw } from '~/renderSettings'
import { migrateAttributeFromMorph } from '~/utils/geometry'
import { convertAllOfOneTypeToOverdrawTests } from '~/utils/materials'
import {
  findAllMeshesUsingMaterial,
  findObject3DByName,
  findObject3DsWhoseNamesInclude,
  maybeFindMeshByName
} from '~/utils/threeUtils'

import { AssetsManager } from '../index'
export default function GameBoardPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  arena: Object3D
) {
  const dropColliderMesh = findObject3DByName<Mesh>(arena, 'field-collider')
  dropColliderMesh.material = materialLibrary.collider

  for (const mesh of findObject3DsWhoseNamesInclude<Mesh>(
    arena,
    'collider',
    true
  )) {
    mesh.material = materialLibrary.collider
  }

  for (const highlight of findObject3DsWhoseNamesInclude<Mesh>(
    arena,
    `highlight`
  )) {
    highlight.visible = false
  }

  const ropeShadowMesh = findObject3DByName<Mesh>(arena, 'field-rope-shadow')
  ropeShadowMesh.material = new MeshBasicMaterial({
    color: COLOR_BLACK,
    transparent: true,
    opacity: 0.25,
    depthTest: true,
    depthWrite: false
  })
  ropeShadowMesh.renderOrder = -10
  ropeShadowMesh.material.visible = false

  const debugStoneMat = new MeshBasicMaterial({
    color: 0xff00ff
  })
  const debugStone = new Mesh(
    new BoxBufferGeometry(1, 1, 1, 1, 1, 1),
    debugStoneMat
  )
  debugStone.name = 'magic stone box with lights and grass_1'
  debugStone.position.set(3.8, -0.2, -2.5)
  debugStone.rotation.set(Math.PI * -0.1, Math.PI * -0.2, Math.PI * 0.3)
  debugStoneMat.visible = false
  arena.add(debugStone)
  if (testOverdraw.value) {
    convertAllOfOneTypeToOverdrawTests(arena, MeshLambertMaterial)
  }

  for (const mesh of findObject3DsWhoseNamesInclude<Mesh>(
    arena,
    'statues-lit'
  )) {
    mesh.visible = false
  }

  const highlightMesh = maybeFindMeshByName(arena, 'field-highlight')
  if (highlightMesh) {
    const namesOfMeshesMissingMorphTargets: string[] = []
    for (const mesh of findAllMeshesUsingMaterial(
      arena,
      highlightMesh.material
    )) {
      try {
        migrateAttributeFromMorph(mesh.geometry, 0, 'antiposition')
      } catch (e) {
        namesOfMeshesMissingMorphTargets.push(mesh.name)
      }
    }
    if (namesOfMeshesMissingMorphTargets.length > 0) {
      console.warn(
        'Could not find morph targets for following meshes: ' +
          namesOfMeshesMissingMorphTargets.join(', ')
      )
    }
  }
}
