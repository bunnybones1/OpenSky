import { Mesh, MeshLambertMaterial, Object3D } from 'three'

import inputProvider from '~/systems/input/input'

import { hitTestAtPixel } from './camera'
import { cameraShaker } from './cameraShaker'
import {
  onMagicStoneClicked,
  registerDebugMaterial,
  specialObjectName
} from './debugGui'
import { findMaterialByName, findObject3DByName } from './threeUtils'

export function attachDebugGuiToScene(arena: Object3D) {
  try {
    const magicStone = findObject3DByName<Mesh>(arena, specialObjectName)
    const dropColliderMesh = findObject3DByName<Mesh>(
      arena,
      'field-collider',
      true
    )
    inputProvider.onSelect.addListener((x, y) => {
      hitTestAtPixel(
        x,
        y,
        [magicStone, dropColliderMesh],
        obj => {
          onMagicStoneClicked(obj)
          return true
        },
        cameraShaker.camera
      )
    })
  } catch (e) {
    console.warn(
      `Could not attach debug Gui to scene. Missing ${specialObjectName}`
    )
  }

  const debugMat = findMaterialByName(arena, 'magic stone glow')

  if (debugMat) {
    registerDebugMaterial(debugMat as MeshLambertMaterial)
  }
}
