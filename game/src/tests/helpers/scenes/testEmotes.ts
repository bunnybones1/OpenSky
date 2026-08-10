import { Emotes } from '@opensky/shared/game-server-message-types'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import EmoteRingOpenComponent from '~/components/EmoteRingOpenComponent'
import TransformComponent from '~/components/TransformComponent'
import { debugAccounts } from '~/debugAccounts'
import { createBaseRarityCardFromId } from '~/helpers/cardHelpers'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { scene } from '~/scenes/arena/scene'
import { storeHelper } from '~/state/index'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
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

async function testEmotes() {
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
  const emoteSystem = new EmoteSystem()
  emoteSystem.cardSelectionFinished = true
  world.addSystem(emoteSystem)

  const cards = (['2005', '2005'] as const).map(id => {
    const card = createBaseRarityCardFromId(id, 'character', [])!
    const zone = card.get('zone')
    zone.setStateZone('Field')
    zone.setOwner('Player')
    return card
  })
  const card = cards[0]
  const otherCard = cards[1]
  const emoteRing = globalAccess.ui!.getContainer('emoteRing')!
  await emoteRing.ready

  storeHelper.useFakeStoreData = true

  const testsContainer = globalAccess.ui!.getContainer('randomTests')!
  makeQuickButtonColumn(
    testsContainer,
    [
      new QuickButtonData('Show Wheel', () => {
        if (!card.has('emoteRingOpen')) {
          card.add(new EmoteRingOpenComponent())
        }
      }),
      new QuickButtonData('Hide Wheel', () => {
        card.remove('emoteRingOpen')
      }),
      new QuickButtonData('random emote', () => {
        const emote = Emotes[Math.floor(Math.random() * Emotes.length)]
        world.getSystem(EmoteSystem).speakFromEntity(card, `${emote} emote`)
      }),
      new QuickButtonData('random emote 2', () => {
        const emote = Emotes[Math.floor(Math.random() * Emotes.length)]
        world
          .getSystem(EmoteSystem)
          .speakFromEntity(otherCard, `${emote} emote`)
      }),
      new QuickButtonData('enemy stickers', () => {
        const ownedStickers = debugAccounts[0].deckEquipment?.stickers || []
        if (ownedStickers.length === 0) {
          return
        }
        const sticker =
          ownedStickers[Math.floor(Math.random() * ownedStickers.length)]

        world.getSystem(EmoteSystem).showSticker(1, sticker)
      }),
      new QuickButtonData('go crazy', () => {
        setInterval(() => {
          const zone = otherCard.get('zone')
          zone.setStateZone(
            zone.current.cardStatus === 'Hand' ? 'Field' : 'Hand'
          )
        }, 2000)
      })
    ],
    ReadonlyPin.BottomLeft,
    ReadonlyPin.BottomLeft.cloneOffset(40, -200)
  )
  await testsContainer.ready
  testsContainer.show()
  emoteRing.show()
  card.add(new EmoteRingOpenComponent())
}

export const test = testEmotes
