import { BaseCard } from '@skyweaver/state-metadata'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import TransformComponent from '~/components/TransformComponent'
import { createBaseRarityCardFromId } from '~/helpers/cardHelpers'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { scene } from '~/scenes/arena/scene'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import DragSystem from '~/systems/DragSystem'
import EmoteSystem from '~/systems/EmoteSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import GamePinSystem from '~/systems/GamePinSystem'
import inputProvider from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'
import {
  findObject3DsWhoseNamesInclude,
  removeFromParent
} from '~/utils/threeUtils'
import { world } from '~/world'

async function testFocusInspection() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  findObject3DsWhoseNamesInclude<Object3D>(scene, 'rope').forEach(
    removeFromParent
  )
  TransformComponent.defaultScene = scene

  await getAssetsManager().loadAsset('uiSmall')
  await getAssetsManager().loadAsset('particle')
  await getAssetsManager().loadAsset('audioFxMatchEnd')
  await getAssetsManager().loadAsset('gamePiecesGraphical')
  await getAssetsManager().loadAsset('gamePiecesPhysical')

  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new ZoneSystem(scene, cameraShaker.camera))
  world.addSystem(new CardRewardSystem())

  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new GamePinSystem())

  world.addSystem(new DragSystem(inputProvider, getDropTarget('field')))
  world.addSystem(new CardFocusInspectionSystem(globalAccess.ui!))
  const emoteSystem = new EmoteSystem()
  emoteSystem.cardSelectionFinished = true
  world.addSystem(emoteSystem)

  const cards = ['2005', '51'].map(id => {
    const card = createBaseRarityCardFromId(id as BaseCard, 'character', [])!
    const zone = card.get('zone')
    zone.setStateZone('Field')
    zone.setOwner('Player')
    return card
  })

  const focusInspection = globalAccess.ui!.getContainer('cardFocusInspection')!
  await focusInspection.ready

  const testsContainer = globalAccess.ui!.getContainer('randomTests')!
  await testsContainer.ready
  makeQuickButtonColumn(
    testsContainer,
    [
      new QuickButtonData('Show Focus Inspection 1', () => {
        world.getSystem(CardFocusInspectionSystem).setFocusedCard(cards[0])
      }),
      new QuickButtonData('Show Focus Inspection 1', () => {
        world.getSystem(CardFocusInspectionSystem).setFocusedCard(cards[1])
      })
    ],
    ReadonlyPin.BottomRight,
    ReadonlyPin.BottomRight.cloneOffset(-40, -200)
  )

  testsContainer.show()
}

export const test = testFocusInspection
