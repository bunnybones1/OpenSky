import { Box2, Mesh, Object3D, RepeatWrapping, Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import { RENDER_ORDERS } from '~/constants'
import NormalMappedRayCastCylinderCascadeMaterial from '~/materials/NormalMappedRayCastCylinderCascadeMaterial'
import queryParams from '~/queryParams'
import UpdateManager from '~/systems/UpdateManager'
import {
  cloudAltitude,
  cloudBendDirection,
  cloudDepthFar,
  cloudDepthLayers,
  cloudDepthNear,
  cloudLayerOffset,
  cloudPlanePosition,
  cloudPlaneScale,
  cloudScrollSpeed,
  cloudTiltAngle,
  cloudUVScale
} from '~/tempDesignOptions'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

import Sky from './Sky'

const { islandSpin } = queryParams

export const cloudControl = {
  paused: true
}

export async function initClouds(arena: Object3D, sky: Sky) {
  await getAssetsManager().loadAsset('cloudNormals')
  const cloudNormals = getAssetsManager().getAsset('cloudNormals')
  cloudNormals.wrapS = RepeatWrapping
  cloudNormals.wrapT = RepeatWrapping
  const material = new NormalMappedRayCastCylinderCascadeMaterial(
    cloudNormals,
    sky.temporalColorStripHandler.texture,
    sky.temporalColorStripHandler.textureSize,
    new Box2(new Vector2(0.5, 1.5), new Vector2(7.5, 8.5)),
    0.0125
  )
  const mesh = new Mesh(
    getSharedPlaneBufferGeometry(false, false, undefined, 2),
    material
  )
  cloudTiltAngle.listen(a => (mesh.rotation.x = a))
  cloudPlanePosition.listen(p => mesh.position.copy(p))
  cloudPlaneScale.listen(s => mesh.scale.set(s, s, s))
  cloudUVScale.listen(s => (material.uvScale = s))
  cloudLayerOffset.listen(p => (material.layerOffset = p))
  cloudBendDirection.listen(d => (material.bendDir = d))
  cloudDepthNear.listen(d => (material.depthNear = d))
  cloudDepthFar.listen(d => (material.depthFar = d))
  cloudDepthLayers.listen(d => (material.depthLayers = d))
  cloudAltitude.listen(d => (material.altitude = d))
  cloudScrollSpeed.listen(d => (material.scrollSpeed = d))
  mesh.renderOrder = RENDER_ORDERS.sky - (1 + mesh.position.z * 0.0001)
  mesh.name = 'clouds'
  mesh.frustumCulled = false
  arena.add(mesh)
  return mesh
}

export function initIsland(artBucket: Object3D, assetBase: Object3D) {
  // Prepare Arena
  const artSourceChildren = assetBase.children
  for (let i = artSourceChildren.length - 1; i >= 0; i--) {
    artBucket.add(artSourceChildren[i])
  }

  if (islandSpin !== 0) {
    UpdateManager.register({
      update(dt: number) {
        artBucket.rotation.y += islandSpin * dt
        artBucket.updateMatrixWorld(true)
      }
    })
  }
}
