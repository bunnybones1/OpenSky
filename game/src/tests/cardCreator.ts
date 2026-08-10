import {
  i18n,
  i18nInit,
  isSupportedLanguage
} from '@opensky/language-manager'
import { Hero } from '@opensky/proto'
import device from '@opensky/shared/device'
import { CardLibrary, CardMetadata, Rarity } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Clock, Color } from 'three'

import { time } from '~/animationTime'
import CardPopupAssemblage from '~/assemblages/CardPopupAssemblage'
import CharacterAssemblage from '~/assemblages/CharacterAssemblage'
import HeroCardAssemblage, {
  createHeroCardInteractives
} from '~/assemblages/HeroCardAssemblage'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import TransformComponent from '~/components/TransformComponent'
import {
  ARENA_ANGLE,
  fakeAttachID,
  fakeID,
  manaCostCompositeNudge
} from '~/constants'
import env from '~/env'
import { changeFoilContext } from '~/foils/foilHelpers'
import { tryAttachBakedAttachedSpell } from '~/helpers/fakeAttachedSpellHelper'
import {
  i18nextDummyCardBackend,
  writeDummyCardString
} from '~/helpers/i18nDummyCardBackend'
import { createWorldEntity, removeWorldEntity } from '~/helpers/worldHelpers'
import { initMatLibEditor } from '~/lightCaches/materials/initMatLibEditor'
import {
  lightCacheMaterialParamsLibrary,
  linkMaterialChangesToMeshes
} from '~/lightCaches/materials/lightCacheMatLib'
import queryParams from '~/queryParams'
import renderer from '~/renderer'
import { defaultTargetFps } from '~/renderSettings'
import { storeHelper } from '~/state/index'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import { mouseInput, touchInput } from '~/systems/input/input'
import keyboard from '~/systems/input/keyboard'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import UpdateManager from '~/systems/UpdateManager'
import { cameraShaker } from '~/utils/cameraShaker'
import { setCanvasSize } from '~/utils/canvasUtils'
import { createCardInstanceFromID } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import { updateInteractivesForHeroCard } from '~/utils/helpers/HeroCardInteractivesHelpers'
import { nextFrameUpdate } from '~/utils/onNextFrame'
import { taskTimer } from '~/utils/taskTimer'
import { timeWarp } from '~/utils/timeWarp'

import * as composite from '../scenes/composite'
import { world } from '../world'
async function cardCreator() {
  await i18nInit({
    defaultNS: 'game',
    lng:
      queryParams.language && isSupportedLanguage(queryParams.language)
        ? queryParams.language
        : 'en',
    backends: [i18nextDummyCardBackend],
    version: env.GITCOMMIT
  })
  const creator = await createCardCreator()
  window.addEventListener('message', e => {
    const json = e.data
    console.log(json)
    if (!json || typeof json !== 'object') {
      return
    }

    try {
      if (json.cardCreator) {
        const metadata: CardMetadata = json.cardCreator.metadata
        const attachMetadata: CardMetadata | undefined =
          json.cardCreator.attachMetadata

        for (const prop in metadata) {
          ;(creator.metadata as any)[prop] = (metadata as any)[prop]
        }
        creator.attachEnabled = Boolean(attachMetadata)
        if (attachMetadata) {
          for (const prop in attachMetadata) {
            ;(creator.attachMetadata as any)[prop] = (attachMetadata as any)[
              prop
            ]
          }
        }
        creator.refresh()
      }
    } catch {
      // if we failed to parse a postmessage just bail
    }
  })
}

export async function createCardCreator(size?: [number, number]) {
  defaultTargetFps.setValueWithoutPersistence(1)

  globalAccess.overrideAndLockMetalShine = true
  timeWarp.timeScale = 0
  globalAccess.hideShine = true
  if (
    lightCacheMaterialParamsLibrary.manaGem.emission &&
    lightCacheMaterialParamsLibrary.manaGem.emission instanceof Color
  ) {
    lightCacheMaterialParamsLibrary.manaGem.emission.multiplyScalar(0.8)
  }
  // lightCacheLightParamsLibrary.cardCompExtraLight.brightness *= 0.8
  // lightCacheLightParamsLibrary.player.brightness *= 0.1

  composite.initScene()

  if (queryParams.editMaterials) {
    linkMaterialChangesToMeshes(composite.scene)
    initMatLibEditor()
  }

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  manaCostCompositeNudge.set(0.00015, -0.0001)

  if (size) {
    setCanvasSize(size[0] + 'px', size[1] + 'px')
  }
  TransformComponent.defaultScene = composite.scene

  storeHelper.useFakeStoreData = true

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new FrameStyleSystem())

  const clock = new Clock()
  const artOptions = [...CardLibrary.values()].reduce<{
    spells: Set<string>
    heros: Set<String>
    units: Set<string>
    backgrounds: Set<string>
  }>(
    (art, card) => {
      if (card.type === 'unit') {
        art.units.add(card.artSlug)
        art.backgrounds.add(card.backgroundArtSlug)
      } else if (card.type !== 'hero') {
        art.spells.add(card.artSlug)
      } else {
        art.heros.add(card.artSlug)
      }
      return art
    },
    {
      spells: new Set(),
      units: new Set(),
      heros: new Set(),
      backgrounds: new Set()
    }
  )
  const metadata: CardMetadata & { name: string; description: string } = {
    artSlug: artOptions.units.values().next().value,
    backgroundArtSlug: artOptions.backgrounds.values().next().value,
    cost: 'X',
    maxCharges: undefined,
    maxCounters: undefined,
    perTurn: 0,
    effectTypes: [],
    element: 'air',
    health: 1,
    traits: [],
    name: '',
    description: '',
    power: 0,
    prism: 'str',
    spellBehaviour: 'defensive',
    type: 'unit',
    attachment: undefined,
    relatedCards: [],
    set: 'Core Set',
    textVocab: [],
    releaseSeason: 0
  }
  CardLibrary.set(fakeID, metadata)
  const attachMetadata: CardMetadata = {
    artSlug: artOptions.spells.values().next().value,
    backgroundArtSlug: artOptions.backgrounds.values().next().value,
    cost: 0,
    maxCharges: undefined,
    maxCounters: undefined,
    perTurn: 0,
    effectTypes: [],
    element: 'air',
    health: 1,
    traits: [],
    power: 0,
    prism: 'str',
    spellBehaviour: 'defensive',
    type: 'unit',
    attachment: undefined,
    relatedCards: [],
    set: 'Core Set',
    textVocab: [],
    releaseSeason: 0
  }
  CardLibrary.set(fakeAttachID, attachMetadata)

  let rarity: Rarity = 'base'
  let isOnField: boolean = false
  let cardEntity: Entity<Components>

  const refreshPreview = () => {
    if (cardEntity) {
      removeWorldEntity(cardEntity.id)
    }

    writeDummyCardString(`${fakeID}.name`, metadata.name)
    writeDummyCardString(`${fakeID}.description`, metadata.description)
    if (i18n.isInitialized) {
      i18n.reloadResources()
    }
    const cardView = createCardInstanceFromID(fakeID)
    cardView.state.view.rarity = rarity
    let attach
    if (cardView.attachment) {
      attach = createCardInstanceFromID(fakeAttachID)
      attach.state.view.rarity = rarity
    }
    if (cardView.state.view.type === 'hero') {
      cardView.state.view.prism = 'tok'
    }
    const isFieldUnit =
      isOnField &&
      (cardView.state.view.type === 'hero' ||
        cardView.state.view.type === 'unit')

    if (isFieldUnit) {
      cardEntity = createWorldEntity([
        ...CharacterAssemblage(cardView),
        new FrontFacesVisibleComponent()
      ])

      if (attach) {
        tryAttachBakedAttachedSpell(
          cardView,
          attach,
          cardEntity.get('transform'),
          cardEntity.get('mesh'),
          1
        )
      }
    } else {
      if (metadata.type === 'hero') {
        const hero = Hero.ADA

        cardEntity = createWorldEntity(
          HeroCardAssemblage({
            artID: metadata.artSlug,
            bgID: metadata.backgroundArtSlug,
            hero,
            flavorText: '',
            grade: rarity,
            id: 0,
            name: metadata.name
          })
        )
        updateInteractivesForHeroCard(cardEntity, createHeroCardInteractives)
      } else {
        cardEntity = createWorldEntity(
          CardPopupAssemblage(cardView, 0, attach, true)
        )
      }
    }
    changeFoilContext(cardEntity, 'none')
    const transform = cardEntity.get('transform')
    transform.rotation.order = 'YXZ'
    transform.rotation.x = ARENA_ANGLE
    transform.position.set(0.00055, 0.28143, 0.48768)
    transform.translateX(0.0005)
    transform.translateY(0.0008)
    transform.translateZ(-0.0036)
  }

  refreshPreview()

  const render = () => {
    nextFrameUpdate()

    const dt = clock.getDelta()

    time.value += dt

    simpleTweener.rafTick()

    UpdateManager.update(dt)
    taskTimer.update(dt)

    world.update(dt, time.value)
    cameraShaker.update(dt)

    composite.scene.updateMatrixWorld(false)

    // Render Arena
    composite.renderScene(renderer)
  }

  const loop = () => {
    render()

    requestAnimationFrame(loop)
  }

  // Start loop
  requestAnimationFrame(loop)

  // run resize handler to make sure everything initialized correctly
  device.handleChange()

  // Disable mouse & touch input to canvas
  touchInput.dispose()
  mouseInput.dispose()
  // disable in-game keyboard input
  keyboard.stopListeningToAllKeys()

  return {
    refresh: refreshPreview,
    metadata,
    attachMetadata,
    set attachEnabled(e: boolean) {
      metadata.attachment = e ? fakeAttachID : undefined
    },
    set rarity(r: Rarity) {
      rarity = r
    },
    set isOnField(f: boolean) {
      isOnField = f
    },
    artOptions,
    // todo do we need to expose this?
    render
  }
}

export const test = cardCreator
