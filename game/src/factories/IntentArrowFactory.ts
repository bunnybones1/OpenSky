import { moveBetweenArrays } from '@opensky/shared/utils/arrayUtils'
import { Color, Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { RENDER_ORDERS } from '~/constants'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import { IntentArrowMesh } from '~/meshes/IntentArrowMesh'
import { scene } from '~/scenes/arena/scene'
import { findObject3DByName } from '~/utils/threeUtils'

let intentArrowOriginal: Mesh
function getIntentArrowMesh() {
  if (!intentArrowOriginal) {
    intentArrowOriginal = findObject3DByName<Mesh>(
      getAssetsManager().getAsset('gameArrow'),
      'intent-arrow'
    )
  }
  const clone = new IntentArrowMesh(
    intentArrowOriginal.geometry,
    new MagicFireHighlightMeshMaterial(
      getAssetsManager(),
      getFireHighlightOptionOverrides('intent-arrow')!
    )
  )
  clone.renderOrder = RENDER_ORDERS.cardOutline + 1

  return clone
}

const poolFree: IntentArrowMesh[] = []
const poolUsed: IntentArrowMesh[] = []

export function createIntentArrow(source: Object3D, color: Color) {
  if (poolFree.length === 0) {
    poolFree.push(getIntentArrowMesh())
  }
  const arrow = moveBetweenArrays(poolFree, poolUsed, poolFree[0])
  arrow.source = source
  arrow.material.color = color
  scene.add(arrow)
  return arrow
}

export function releaseIntentArrow(arrow: IntentArrowMesh) {
  scene.remove(arrow)
  arrow.source = undefined
  moveBetweenArrays(poolUsed, poolFree, arrow)
}
