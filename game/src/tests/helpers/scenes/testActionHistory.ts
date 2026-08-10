import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { getCardCache, initializeCardCache } from '~/cardCache'
import TransformComponent from '~/components/TransformComponent'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { scene } from '~/scenes/arena/scene'
import { OpenSkyUI } from '~/scenes/ui/OpenSkyUI'
import {
  AnimationOrchestrator,
  animationOrchestratorReadyForSetup,
  animationOrchestratorReadyToStartMatch,
  setAnimationOrchestrator
} from '~/systems/AnimationOrchestrator'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import DragSystem from '~/systems/DragSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import GamePinSystem from '~/systems/GamePinSystem'
import inputProvider from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { cameraShaker } from '~/utils/cameraShaker'
import { createCardInstanceFromID } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'
import {
  findObject3DsWhoseNamesInclude,
  removeFromParent
} from '~/utils/threeUtils'
import { world } from '~/world'

async function testActionHistory() {
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

  initializeCardCache(0)
  setAnimationOrchestrator(
    new AnimationOrchestrator(globalAccess.ui as OpenSkyUI, getCardCache())
  )
  animationOrchestratorReadyForSetup.resolve()
  animationOrchestratorReadyToStartMatch.resolve()
  const actionHistoryContainer = globalAccess.ui!.getContainer('actionHistory')
  await actionHistoryContainer.ready
  actionHistoryContainer.show()

  const testsContainer = globalAccess.ui!.getContainer('randomTests')!
  const attackerCard = createCardInstanceFromID(
    '1082'
  ) as CardInstance<SkyWeaver>
  const defenderCard = createCardInstanceFromID('73') as CardInstance<SkyWeaver>
  makeQuickButtonColumn(
    testsContainer,
    [
      new QuickButtonData('Toggle', () => {
        actionHistoryContainer.sidebar.toggle()
      }),
      new QuickButtonData('Play Card', () => {
        actionHistoryContainer.sidebar.process({
          type: 'PlayCard',
          player: 0,
          card: createCardInstanceFromID('72') as CardInstance<SkyWeaver>,
          items: [
            {
              type: 'Draw',
              player: 0,
              success: true
            }
          ]
        })
      }),
      new QuickButtonData('Start Turn', () => {
        actionHistoryContainer.sidebar.process({
          type: 'StartTurn',
          player: 0,
          items: []
        })
      }),
      new QuickButtonData('End Turn', () => {
        actionHistoryContainer.sidebar.process({
          type: 'EndTurn',
          player: 0,
          items: []
        })
      }),
      new QuickButtonData('Attack', () => {
        actionHistoryContainer.sidebar.process({
          type: 'Attack',
          player: 0,
          attacker: attackerCard,
          defender: defenderCard,
          attackerDied: true,
          defenderDied: false,
          items: [
            {
              type: 'Damage',
              kind: {
                type: 'Combat',
                is_retaliation: false
              },
              source: attackerCard,
              target: defenderCard,
              damage: 4,
              isWither: false,
              isLifesteal: false
            }
          ]
        })
      }),
      new QuickButtonData('Icons', () => {
        actionHistoryContainer.sidebar.process({
          type: 'PlayCard',
          player: 0,
          card: createCardInstanceFromID('1083') as CardInstance<SkyWeaver>,
          items: [
            {
              type: 'Dust',
              card: createCardInstanceFromID('73') as CardInstance<SkyWeaver>
            },
            {
              type: 'Kill',
              card: createCardInstanceFromID('76') as CardInstance<SkyWeaver>
            },
            {
              type: 'Damage',
              kind: {
                type: 'Combat',
                is_retaliation: false
              },
              source: createCardInstanceFromID(
                '1082'
              ) as CardInstance<SkyWeaver>,
              target: createCardInstanceFromID('73') as CardInstance<SkyWeaver>,
              damage: 4,
              isWither: false,
              isLifesteal: false
            }
          ]
        })
      })
    ],
    ReadonlyPin.Center,
    ReadonlyPin.Center
  )
  await testsContainer.ready
  actionHistoryContainer.sidebar.open()
  testsContainer.show()
  actionHistoryContainer.sidebar.open()
}

export const test = testActionHistory
