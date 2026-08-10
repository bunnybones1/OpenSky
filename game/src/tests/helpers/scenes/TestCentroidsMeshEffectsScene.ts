import { getRandom } from '@opensky/shared/utils/arrayUtils'
import { delayPromise } from '@opensky/shared/utils/async'
import { Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { randomArtNames, setupCardArt } from '~/helpers/cardArtHelpers'
import { openPortal } from '~/helpers/meshEffectHelpers'
import { scene } from '~/scenes/arena/scene'
import { cameraShaker } from '~/utils/cameraShaker'
import { modifyMeshForCentroidAnimations } from '~/utils/experimentalGltfCleanup'

async function testCentroidsMeshEffectsScene() {
  // await getAssetsManager().loadAsset('testCentroids')
  // const mesh = fetchMeshClone('testCentroids', 'test-centroids')

  await getAssetsManager().loadAsset('gamePiecesGraphical')
  const artMeshShattered = getAssetsManager().fetchMeshDeepClone(
    'gamePiecesGraphical',
    'token-unit-shattered-art',
    undefined,
    true
  ) as Mesh

  modifyMeshForCentroidAnimations(artMeshShattered)

  const isSpell = artMeshShattered.name.includes('spell')
  const bgUrl = `game/cards/art-full/bgs/${getRandom(randomArtNames.bgs)}.png`
  const fgUrl = isSpell
    ? `game/cards/art-full/spells/${getRandom(randomArtNames.spells)}.png`
    : `game/cards/art-full/units/${getRandom(randomArtNames.fgs)}.png`

  const meshCopy = setupCardArt(
    cameraShaker.camera,
    artMeshShattered,
    'sky',
    isSpell ? 'spell' : 'unit',
    bgUrl,
    fgUrl
  )

  const cardPivot = new Object3D()
  scene.add(cardPivot)
  cardPivot.add(meshCopy)
  cardPivot.rotation.set(Math.PI * -0.15, 0, 0)
  cardPivot.position.y = 0.2

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  const frameMeshShattered = getAssetsManager().fetchMeshDeepClone(
    'gamePiecesPhysical',
    'unit-frame-shattered'
  ) as Mesh
  modifyMeshForCentroidAnimations(frameMeshShattered)
  frameMeshShattered.position.y = -0.009
  frameMeshShattered.position.z = -0.002
  frameMeshShattered.rotation.set(Math.PI * 0.5, 0, 0)
  frameMeshShattered.scale.set(2.75, 2.75, 2.75)
  cardPivot.add(frameMeshShattered)
  await delayPromise(900)
  const p = openPortal(cardPivot).mesh
  p.scale.set(6, 6, 6)
  p.rotation.x = Math.PI * 0.5
}

export const test = testCentroidsMeshEffectsScene
