import TransformComponent from '~/components/TransformComponent'
import { camera } from '~/scenes/arena'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { scene } from '~/scenes/arena/scene'
import { registerZoneSystem } from '~/systems/animation/zoneAnimationLib'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import DragSystem from '~/systems/DragSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import HighlightMaterialSystem from '~/systems/HighlightMaterialSystem'
import inputProvider from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'

import { getAssetsManager } from '../../assets'
import CardVisualsSystem from '../../systems/CardVisualsSystem'
import TextureAnimationSystem from '../../systems/TextureAnimationSystem'
import { world } from '../../world'
import draftMockupInternals from './draftMockupInternals'

let cleanup: () => void | undefined
if (import.meta.hot) {
  import.meta.hot.accept('./draftMockupInternals', (mod: any) => {
    if (cleanup) {
      cleanup()
      cleanup = mod.default(scene)
    }
  })
}
async function draftMockup() {
  const islandTest = new BasicIslandTest(false)
  await islandTest.init()

  TransformComponent.defaultScene = scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new HighlightMaterialSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new FrameStyleSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  const zoneSystem = new ZoneSystem(scene, camera)
  world.addSystem(zoneSystem)
  registerZoneSystem(zoneSystem)
  world.addSystem(new DragSystem(inputProvider, getDropTarget('field')))

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  cleanup = draftMockupInternals(scene)
}

export const test = draftMockup
