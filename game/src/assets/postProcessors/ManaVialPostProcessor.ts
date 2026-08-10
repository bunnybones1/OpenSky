import { Mesh, MeshBasicMaterial, Object3D } from 'three'

import { atmosphereColorForIsland } from '~/colors/colorLibrary'
import ManaVialMeshMaterial from '~/materials/ManaVialMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { exchangeMesh } from '~/utils/meshUtils'
import { findObject3DByName } from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function ManaVialPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  manaVial: Object3D
) {
  const manaVialMesh = findObject3DByName<Mesh>(manaVial, 'mana-vial')
  if (manaVialMesh.material instanceof MeshBasicMaterial) {
    const manaVialMesh2D = new Mesh2D(
      manaVialMesh.geometry,
      new ManaVialMeshMaterial(
        {
          map: manaVialMesh.material.map!,
          overlayColor: atmosphereColorForIsland
        },
        { transparent: true }
      )
    )
    manaVialMesh.frustumCulled = false
    exchangeMesh(manaVialMesh, manaVialMesh2D)
  }
}
