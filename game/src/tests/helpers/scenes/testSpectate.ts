import { StickerLibrary } from '@opensky/shared/cosmetics'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import TransformComponent from '~/components/TransformComponent'
import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import queryParams from '~/queryParams'
import { scene } from '~/scenes/arena/scene'
import { store, storeHelper } from '~/state'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { globalAccess } from '~/utils/globalAccess'
import { changeUrlParamAndReload } from '~/utils/location'
import {
  findObject3DsWhoseNamesInclude,
  removeFromParent
} from '~/utils/threeUtils'

async function testSpectate() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  findObject3DsWhoseNamesInclude<Object3D>(scene, 'rope').forEach(
    removeFromParent
  )
  TransformComponent.defaultScene = scene

  if (gameMode !== LocalGameMode.SPECTATE) {
    changeUrlParamAndReload('mode', 'SPECTATE')
  }

  if (!queryParams.fakeStickers) {
    changeUrlParamAndReload(
      'fakeStickers',
      [...new Set([...StickerLibrary.values()])].map(s => s.id).join(',')
    )
  }

  await getAssetsManager().loadAsset('uiSmall')
  await getAssetsManager().loadAsset('particle')
  await getAssetsManager().loadAsset('audioFxMatchEnd')
  await getAssetsManager().loadAsset('gamePiecesGraphical')
  await getAssetsManager().loadAsset('gamePiecesPhysical')

  const spectators = globalAccess.ui!.getContainer('spectatorCount')
  spectators.ready.then(() => spectators.fadeIn())
  const stickersButton = globalAccess.ui!.getContainer('endTurnButton')
  stickersButton.ready.then(() => stickersButton.fadeIn())

  storeHelper.useFakeStoreData = true

  store.spectators = [
    { id: 1, address: 'dummy account', canSeeHand: false },
    { id: 2, address: 'dummy 2', canSeeHand: false },
    { id: 3, address: 'dummy 4 wow', canSeeHand: true },
    { id: 4, address: 'dummy 3', canSeeHand: true }
  ]
}

export const test = testSpectate
