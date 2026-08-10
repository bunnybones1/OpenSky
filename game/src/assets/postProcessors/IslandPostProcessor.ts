import { LessDepth, Mesh, MeshBasicMaterial, Object3D } from 'three'

import { atmosphereColorForIsland } from '~/colors/colorLibrary'
import { RENDER_ORDERS } from '~/constants'
import BasicMapMeshMaterial, {
  BasicMapMeshMaterialParameters
} from '~/materials/BasicMapMeshMaterial'
import materialLibrary from '~/materials/library'
import {
  findObject3DByName,
  findObject3DsWhoseNamesInclude
} from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function IslandPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  arena: Object3D
) {
  const islandOpaque = findObject3DByName<Mesh>(arena, 'surface', true)
  const islandTransparent = islandOpaque.clone(true)
  islandTransparent.position.set(0, 0, 0)
  islandTransparent.scale.set(1, 1, 1)
  islandTransparent.rotation.set(0, 0, 0)
  islandOpaque.add(islandTransparent)
  const originalMaterial = islandOpaque.material
  if (originalMaterial instanceof MeshBasicMaterial) {
    const matOpts: BasicMapMeshMaterialParameters = {
      map: originalMaterial.map!,
      overlayColor: atmosphereColorForIsland
    }

    islandOpaque.material = new BasicMapMeshMaterial(matOpts, {
      alphaTest: 0.98,
      transparent: false,
      depthWrite: true,
      depthTest: true
    })
    islandOpaque.renderOrder = RENDER_ORDERS.sky - 10

    islandTransparent.material = new BasicMapMeshMaterial(matOpts, {
      opacity: 1,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      depthFunc: LessDepth
    })
    islandTransparent.renderOrder = RENDER_ORDERS.sky + 10
  }

  for (const mesh of findObject3DsWhoseNamesInclude<Mesh>(
    arena,
    'collider',
    true
  )) {
    mesh.material = materialLibrary.collider
  }
}
