import { getAssetsManager } from '~/assets'
import { initializeCardCache } from '~/cardCache'
import TransformComponent from '~/components/TransformComponent'
import { getFakeRewards } from '~/debug/fakeRewards'
import { debugAccounts } from '~/debugAccounts'
import { showMatchEnd } from '~/helpers/matchEndHelpers'
import { changeMusicToMatchEndSong } from '~/helpers/soundHelpers'
import { uiJump } from '~/helpers/uiJumpHelper'
import queryParams from '~/queryParams'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { scene } from '~/scenes/arena/scene'
import { store, storeHelper } from '~/state'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import DragSystem from '~/systems/DragSystem'
import FloatationSystem from '~/systems/FloatationSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import inputProvider from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { world } from '~/world'

export default async function testEndMatch() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  TransformComponent.defaultScene = scene

  await getAssetsManager().loadAsset('uiSmall')
  await getAssetsManager().loadAsset('particle')
  await getAssetsManager().loadAsset('audioFxCommon')
  await getAssetsManager().loadAsset('audioFxMatchEnd')
  await getAssetsManager().loadAsset('gamePiecesGraphical')
  await getAssetsManager().loadAsset('gamePiecesPhysical')

  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new CardFocusInspectionSystem(globalAccess.ui!))
  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new FrameStyleSystem())
  world.addSystem(new ZoneSystem(scene, cameraShaker.camera))
  world.addSystem(new CardRewardSystem())
  world.addSystem(new FloatationSystem())

  world.addSystem(new FrontFaceHidingSystem())

  world.addSystem(new DragSystem(inputProvider, getDropTarget('field')))
  storeHelper.fakeGameOver = true
  storeHelper.useFakeStoreData = true
  initializeCardCache(0)
  store.emitStoreEvent()

  const musicType =
    (await storeHelper.getMatchEndType()) === 'defeat'
      ? 'musicDefeat'
      : 'musicVictory'

  await getAssetsManager().loadAsset(musicType, 1)

  changeMusicToMatchEndSong(musicType)

  if (uiJump('endReview')) {
    const matchEndReviewContainer =
      globalAccess.ui!.getContainer('matchEndReview')
    const matchEndContinueContainer = globalAccess.ui!.getContainer(
      'endMatchContinueButton'
    )
    await Promise.all([
      matchEndReviewContainer.ready,
      matchEndContinueContainer.ready
    ])

    await Promise.all([
      matchEndReviewContainer.fadeIn(),
      matchEndContinueContainer.fadeIn()
    ])

    await matchEndContinueContainer.continue
  }

  await showMatchEnd(
    globalAccess.ui!,
    uiLookup[await storeHelper.getMatchEndType()],
    new Promise(resolve => {
      resolve(undefined)
    }),
    () => getFakeRewards(queryParams.fakeRewards || 'basic') || [],
    debugAccounts[0]
  )
}

const uiLookup = {
  victory: 'matchEndVictory',
  defeat: 'matchEndDefeat',
  tie: 'matchEndTie'
} as const
