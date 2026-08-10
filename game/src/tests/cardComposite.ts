import { i18n, i18nInit, SupportedLanguage } from '@opensky/language-manager'
import { Hero } from '@opensky/proto'
import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { CardBackLibrary, HeroSkinLibrary } from '@opensky/shared/cosmetics'
import device from '@opensky/shared/device'
import { downsamplePixels } from '@opensky/shared/renderSettings'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { BaseCard, CardLibrary, Rarity } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Clock, Color, Euler, Quaternion } from 'three'

import { time } from '~/animationTime'
import CardPopupAssemblage from '~/assemblages/CardPopupAssemblage'
import HeroAbilityPopupAssemblage from '~/assemblages/HeroAbilityPopupAssemblage'
import HeroCardAssemblage, {
  createHeroCardInteractives
} from '~/assemblages/HeroCardAssemblage'
import HeroMiniAbilityPopupAssemblage from '~/assemblages/HeroMiniAbilityPopupAssemblage'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import TransformComponent from '~/components/TransformComponent'
import { ARENA_ANGLE, manaCostCompositeNudge } from '~/constants'
import env from '~/env'
import { changeFoilContext } from '~/foils/foilHelpers'
import { cardArtFolder } from '~/helpers/cardArtHelpers'
import { getCardBackMesh } from '~/helpers/cardBacks'
import { RarityStrings } from '~/helpers/typeHelpers'
import { createWorldEntity, removeWorldEntity } from '~/helpers/worldHelpers'
import { initMatLibEditor } from '~/lightCaches/materials/initMatLibEditor'
import {
  lightCacheMaterialParamsLibrary,
  linkMaterialChangesToMeshes
} from '~/lightCaches/materials/lightCacheMatLib'
import { getCardAssetString } from '~/materials'
import { useSafeParallax } from '~/parallaxSettings'
import queryParams from '~/queryParams'
import renderer from '~/renderer'
import { storeHelper } from '~/state/index'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import keyboard from '~/systems/input/keyboard'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import UpdateManager from '~/systems/UpdateManager'
import { cameraShaker } from '~/utils/cameraShaker'
import { setCanvasSize } from '~/utils/canvasUtils'
import { getFakeCardTagView } from '~/utils/card'
import { changeFrameRarity } from '~/utils/changeFrameRarity'
import { globalAccess } from '~/utils/globalAccess'
import { applyInteractivesOnCard } from '~/utils/helpers/InteractivesHelpers'
import { nextFrameUpdate } from '~/utils/onNextFrame'
import { taskTimer } from '~/utils/taskTimer'
import { getTempQuatFromEuler } from '~/utils/threeMathUtils'
import { timeWarp } from '~/utils/timeWarp'

import * as composite from '../scenes/composite'
import { world } from '../world'

const ROTATION_PERIOD = Math.PI * 2 * 1000
const ROTATION_TIME = 4.5
const ROTATION_FPS = 60
const TOTAL_FRAMES = ROTATION_TIME * ROTATION_FPS

type CompositeData =
  | { type: 'card'; id: BaseCard; frameStyle: Rarity; lang: SupportedLanguage }
  | {
      type: 'hero'
      skin: { type: 'skin'; skinID: number } | { type: 'base'; hero: Hero }
    }
  | {
      type: 'cardBack'
      id: number
    }
  | {
      type: 'heroMiniAbility'
      id: BaseCard
    }

async function cardComposite() {
  globalAccess.overrideAndLockMetalShine = true
  globalAccess.useTrueArtistColorsOnCardArt = true
  useSafeParallax.value = true
  timeWarp.timeScale = 0
  globalAccess.hideShine = true

  // always render at 100% texture resolution
  downsamplePixels.value = 999

  if (
    lightCacheMaterialParamsLibrary.manaGem.emission &&
    lightCacheMaterialParamsLibrary.manaGem.emission instanceof Color
  ) {
    lightCacheMaterialParamsLibrary.manaGem.emission.multiplyScalar(0.8)
  }

  composite.initScene()
  await i18nInit({
    defaultNS: 'game',
    lng: 'en',
    version: env.GITCOMMIT
  })

  if (queryParams.editMaterials) {
    linkMaterialChangesToMeshes(composite.scene)
    initMatLibEditor()
  }

  storeHelper.useFakeStoreData = true

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  manaCostCompositeNudge.set(0.00015, -0.0001)

  setCanvasSize('553px', '850px')

  TransformComponent.defaultScene = composite.scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new FrameStyleSystem())

  const clock = new Clock()
  const cardViews = [...CardLibrary.keys()]
    .sort((a, b) => Number(a) - Number(b))
    .map(id => getFakeCardTagView(id, 'base'))
  let cardEntity: Entity<Components>

  let compositeData: CompositeData = getCompositeDataFromHash() ?? {
    lang: 'en',
    type: 'card',
    id: cardViews[0].base,
    frameStyle: 'base'
  }

  let shouldExport = false
  let exportResolver: any

  const handleCardUpdate = async () => {
    if (cardEntity) {
      removeWorldEntity(cardEntity.id)
    }
    if ('lang' in compositeData && i18n.language !== compositeData.lang) {
      await i18n.changeLanguage(compositeData.lang)
    }
    if (compositeData.type === 'card') {
      const { id, frameStyle } = compositeData
      const newView = cardViews.find(c => c.base === id)!
      newView.state.view.rarity = frameStyle
      if (newView.state.view.type === 'heroAbility') {
        cardEntity = createWorldEntity(HeroAbilityPopupAssemblage(newView, 0))
      } else {
        cardEntity = createWorldEntity(
          CardPopupAssemblage(newView, 0, undefined, true)
        )
      }
    } else if (compositeData.type === 'cardBack') {
      const assemblage = CardPopupAssemblage(cardViews[0], 0, undefined, true)
      cardEntity = createWorldEntity(assemblage)
      getCardBackMesh(CardBackLibrary.get(compositeData.id)!).then(mesh => {
        if (cardEntity.has('mesh')) {
          cardEntity.get('mesh').add(mesh)
        }
      })
      changeFrameRarity(cardEntity.get('mesh'), 'base', false, false, true)
    } else if (compositeData.type === 'heroMiniAbility') {
      const { id } = compositeData
      const newView = cardViews.find(c => c.base === id)!
      cardEntity = createWorldEntity(HeroMiniAbilityPopupAssemblage(newView, 0))
    } else {
      const heroSkin =
        compositeData.skin.type === 'base'
          ? BASE_HERO_SKINS[compositeData.skin.hero]
          : HeroSkinLibrary.get(compositeData.skin.skinID)!
      cardEntity = createWorldEntity(HeroCardAssemblage(heroSkin))

      applyInteractivesOnCard(cardEntity, createHeroCardInteractives(heroSkin))
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

  handleCardUpdate()

  keyboard.listenToKey('Enter', () => {
    shouldExport = true
    frameCounter = 0
  })
  keyboard.listenToKey('ArrowLeft', () => {
    if (
      compositeData.type === 'card' ||
      compositeData.type === 'heroMiniAbility'
    ) {
      const id = compositeData.id
      compositeData.id = getFromArrayWrapped(
        cardViews,
        cardViews.findIndex(c => c.base === id) - 1
      ).base
    }
    handleCardUpdate()
  })
  keyboard.listenToKey('ArrowRight', () => {
    if (
      compositeData.type === 'card' ||
      compositeData.type === 'heroMiniAbility'
    ) {
      const id = compositeData.id
      compositeData.id = getFromArrayWrapped(
        cardViews,
        cardViews.findIndex(c => c.base === id) + 1
      ).base
    }
    handleCardUpdate()
  })
  keyboard.listenToKey('ArrowUp', () => {
    if (compositeData.type === 'card') {
      const rarity = compositeData.frameStyle
      compositeData.frameStyle = getFromArrayWrapped(
        RarityStrings,
        RarityStrings.findIndex(c => c === rarity) - 1
      )
    }
    handleCardUpdate()
  })
  keyboard.listenToKey('ArrowDown', () => {
    if (compositeData.type === 'card') {
      const rarity = compositeData.frameStyle
      compositeData.frameStyle = getFromArrayWrapped(
        RarityStrings,
        RarityStrings.findIndex(c => c === rarity) + 1
      )
    }
    handleCardUpdate()
  })
  keyboard.listenToKey(' ', () => {
    if (compositeData.type === 'card') {
      compositeData = {
        type: 'hero',
        skin: {
          type: 'base',
          hero: Hero.ADA
        }
      }
    } else if (compositeData.type === 'cardBack') {
      compositeData = {
        lang: 'en',
        type: 'card',
        frameStyle: 'base',
        id: cardViews[0].base
      }
    } else {
      compositeData = {
        type: 'cardBack',
        id: [...CardBackLibrary.keys()][0]
      }
    }
    handleCardUpdate()
  })

  window.onhashchange = () => {
    const data = getCompositeDataFromHash()
    if (data) {
      compositeData = data
    }
    handleCardUpdate()
  }

  // Expose export method on window for asset-pipeline task
  window.exportCanvasData = () =>
    new Promise(resolve => {
      exportResolver = resolve
      shouldExport = true
      frameCounter = 0
    })

  const exportPNG = async () => {
    shouldExport = false

    if (compositeData.type === 'card') {
      const { artSlug, backgroundArtSlug, attachment, type } = CardLibrary.get(
        compositeData.id
      )!

      const bgUrl = `game/cards/art-full/bgs/${
        type === 'heroAbility' ? `${artSlug}-blurred` : `${backgroundArtSlug}`
      }.png`

      const fgUrl = `game/cards/art-full/${cardArtFolder[type]}s/${artSlug}.png`

      const assets = [
        getAssetsManager().load('texture', bgUrl),
        getAssetsManager().load('texture', fgUrl)
      ]

      if (attachment) {
        const attachementUrl = `game/cards/art-full/spells/${getCardAssetString(
          attachment
        )}.png`
        assets.push(getAssetsManager().load('texture', attachementUrl))
      }
      await Promise.all(assets)
    }

    render()

    const data = renderer.domElement.toDataURL()

    if (exportResolver) {
      exportResolver(data)
    } else {
      const a = document.createElement('a')
      a.href = data.replace('image/png', 'image/octet-stream')
      a.download = `${
        compositeData.type === 'card'
          ? compositeData.id
          : compositeData.type === 'cardBack'
          ? `cardback-${compositeData.id}-frame-${frameCounter}`
          : compositeData.type === 'heroMiniAbility'
          ? `ability-mini-${compositeData.id}`
          : `hero-${compositeData.type}-${
              compositeData.skin.type === 'base'
                ? compositeData.skin.hero
                : compositeData.skin.skinID
            }`
      }.png`
      a.click()
    }
  }

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
  let frameCounter = 0

  const loop = () => {
    render()

    if (shouldExport) {
      exportPNG()
      if (compositeData.type === 'cardBack') {
        const percentage = frameCounter / TOTAL_FRAMES
        shouldExport = percentage < 1
      }
    }

    if (compositeData.type === 'cardBack') {
      frameCounter += 1
      const percentage = frameCounter / TOTAL_FRAMES
      const t = ROTATION_PERIOD * percentage
      const s = 0.1
      cardEntity
        .get('transform')
        .quaternion.copy(getTempQuatFromEuler(-Math.PI * 0.5, 0, 0))
        .premultiply(
          new Quaternion().setFromEuler(
            new Euler(
              Math.cos(-t * 0.001) * s,
              Math.sin(-t * 0.001) * 2 * s,
              Math.sin(t * 0.001) * 0.1
            )
          )
        )
        .premultiply(getTempQuatFromEuler(Math.PI * 0.5, Math.PI, 0))
        .premultiply(getTempQuatFromEuler(ARENA_ANGLE, 0, 0))
    }

    requestAnimationFrame(loop)
  }

  // Start loop
  requestAnimationFrame(loop)

  // run resize handler to make sure everything initialized correctly
  device.handleChange()
}

function getCompositeDataFromHash(): CompositeData | undefined {
  const value = location.hash.replace(/^#/, '')
  const [type, id, rarity, ...lang] = value.split('-')
  if (type === 'card') {
    return {
      lang: lang.join('-') as SupportedLanguage,
      type,
      frameStyle: (rarity || 'base') as Rarity,
      id: id as BaseCard
    }
  } else if (type === 'hero') {
    const skinIDNumber = Number.parseInt(id, 10)

    const skinType = Number.isNaN(skinIDNumber) ? 'base' : 'skin'
    return {
      type,
      skin:
        skinType === 'base'
          ? { type: skinType, hero: id as Hero }
          : { type: skinType, skinID: skinIDNumber }
    }
  } else if (type === 'cardBack') {
    return {
      type,
      id: Number.parseInt(id, 10)
    }
  } else if (type === 'heroMiniAbility') {
    return {
      type,
      id: id as BaseCard
    }
  } else {
    return undefined
  }
}

export const test = cardComposite
