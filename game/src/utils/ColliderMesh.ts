import { BufferGeometry, Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { I2D } from '~/helpers/I2D'
import materialLibrary from '~/materials/library'
import Mesh2D, { DepthMaterial2D } from '~/meshes/Mesh2D'
import IInteractive from '~/systems/input/IInteractive'

import { getSharedPlaneBufferGeometry } from './geometry'
import { findObject3DByName } from './threeUtils'

const __colliderOffset = new Vector3(0.5, 0.5, 0)

let __protoColliderGeometry: BufferGeometry | undefined
let __protoColliderMaterial: DepthMaterial2D | undefined
function __requestColliderMeshUpgrade(mesh: Mesh2D) {
  if (mesh.geometry === __protoColliderGeometry) {
    // already ugpraded.
    return
  }
  if (__protoColliderGeometry && __protoColliderMaterial) {
    mesh.geometry = __protoColliderGeometry

    const oldDepth = mesh.material.depth
    mesh.material = __protoColliderMaterial.clone()
    mesh.material.depth = oldDepth
  } else {
    getAssetsManager()
      .loadAsset('uiSmall')
      .then(() => {
        const newMesh = findObject3DByName(
          getAssetsManager().getAsset('uiSmall'),
          'collider-box'
        ) as Mesh2D

        __protoColliderGeometry = newMesh.geometry
        __protoColliderMaterial = newMesh.material
        __requestColliderMeshUpgrade(mesh)
      })
  }
}
export default class ColliderMesh extends Mesh2D implements I2D {
  constructor(
    public interactions: IInteractive,
    clipSpaceDepth: number
  ) {
    super(
      __protoColliderGeometry ||
        getSharedPlaneBufferGeometry(false, false, __colliderOffset),
      (
        __protoColliderMaterial ||
        materialLibrary.getCollider2d(getAssetsManager())
      ).clone()
    )
    this.material.depth = clipSpaceDepth
    __requestColliderMeshUpgrade(this)
    this.frustumCulled = false
  }
}
