import {
  i18nInit,
  isSupportedLanguage,
  LOCALE_LOCAL_STORAGE_KEY
} from '@opensky/language-manager'
import device from '@opensky/shared/device'
import renderController from '@opensky/shared/renderController'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { getLocalStorageParam } from '@opensky/shared/utils/localStorage'
import { BaseCard, CardLibrary, Rarity } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Clock, Color, Euler, Quaternion } from 'three'

import { time } from '~/animationTime'
import CardPopupAssemblage from '~/assemblages/CardPopupAssemblage'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import TransformComponent from '~/components/TransformComponent'
import { ARENA_ANGLE, manaCostCompositeNudge } from '~/constants'
import env from '~/env'
import { gameEngineController } from '~/gameEngineController'
import { registerParallaxListener } from '~/helpers/parallaxHelpers'
import { createWorldEntity, removeWorldEntity } from '~/helpers/worldHelpers'
import { initMatLibEditor } from '~/lightCaches/materials/initMatLibEditor'
import {
  lightCacheMaterialParamsLibrary,
  linkMaterialChangesToMeshes
} from '~/lightCaches/materials/lightCacheMatLib'
import { useSafeParallax } from '~/parallaxSettings'
import queryParams from '~/queryParams'
import renderer from '~/renderer'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import UpdateManager from '~/systems/UpdateManager'
import { useParallaxOnCardInspector } from '~/userSettings'
import { cameraShaker } from '~/utils/cameraShaker'
import { getFakeCardTagView } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import { nextFrameUpdate } from '~/utils/onNextFrame'
import { taskTimer } from '~/utils/taskTimer'
import { getQuatFromEuler } from '~/utils/threeMathUtils'
import { timeWarp } from '~/utils/timeWarp'

import * as composite from '../scenes/composite'
import { world } from '../world'

const __tempQuat = new Quaternion()
const __tempEuler = new Euler()
__tempEuler.order = 'YXZ'

async function cardViewer() {
  const lang = getLocalStorageParam(LOCALE_LOCAL_STORAGE_KEY) ?? ''

  await i18nInit({
    defaultNS: 'game',
    lng: isSupportedLanguage(lang) ? lang : 'en',
    version: env.GITCOMMIT
  })

  globalAccess.uiSkip = true

  globalAccess.overrideAndLockMetalShine = true
  globalAccess.useTrueArtistColorsOnCardArt = true
  useSafeParallax.value = true
  timeWarp.timeScale = 0
  globalAccess.hideShine = true
  if (
    lightCacheMaterialParamsLibrary.manaGem.emission &&
    lightCacheMaterialParamsLibrary.manaGem.emission instanceof Color
  ) {
    lightCacheMaterialParamsLibrary.manaGem.emission.multiplyScalar(0.8)
  }

  composite.initScene()

  if (queryParams.editMaterials) {
    linkMaterialChangesToMeshes(composite.scene)
    initMatLibEditor()
  }

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  manaCostCompositeNudge.set(0.00015, -0.0001)

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

  let cardId = cardViews[0].base
  let cardIdx = 0

  const _tilt = new Quaternion()
  if (useParallaxOnCardInspector.value) {
    const preTilt = getQuatFromEuler(Math.PI * 0.5, 0, 0)
    const postTilt = getQuatFromEuler(Math.PI * -0.5, 0, 0)
    registerParallaxListener(
      q => {
        // _tilt.copy(q)
        _tilt.copy(preTilt)
        _tilt.multiply(q)
        _tilt.multiply(postTilt)
      },
      v => v * -0.15
    )
  }

  UpdateManager.register({
    update() {
      if (!cardEntity) {
        return
      }
      const transform = cardEntity.get('transform')
      __tempEuler.set(ARENA_ANGLE, 0, 0)
      __tempQuat.setFromEuler(__tempEuler)
      transform.quaternion.copy(__tempQuat)
      __tempQuat.multiply(_tilt)
      transform.quaternion.slerp(__tempQuat, Math.max(0.0, 1.0))
    }
  })

  let lastRarity: Rarity = 'base'
  const handleCardUpdate = () => {
    const newView = getFromArrayWrapped(cardViews, cardIdx)
    cardId = newView.base
    if (cardEntity) {
      removeWorldEntity(cardEntity.id)
    }
    newView.state.view.rarity = lastRarity
    cardEntity = createWorldEntity(
      CardPopupAssemblage(newView, 0, undefined, true)
    )

    const transform = cardEntity.get('transform')
    transform.rotation.order = 'YXZ'
    transform.rotation.x = ARENA_ANGLE
    transform.position.set(0.00055, 0.28143, 0.48768)
    transform.translateX(0.0005)
    transform.translateY(0.0008)
    transform.translateZ(-0.0036)
  }

  const setCard = (id: BaseCard) => {
    cardId = id
    cardIdx = cardViews.findIndex(x => x.base === id)

    if (cardIdx === -1) {
      throw new Error(`Could not find card with id: ${id}`)
    }

    handleCardUpdate()
  }

  setCard(cardId)

  gameEngineController.listenForCardChange((id: BaseCard, rarity: Rarity) => {
    lastRarity = rarity
    setCard(id)
  })

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
    if (renderController.active) {
      render()
    }
    requestAnimationFrame(loop)
  }

  // Start loop
  requestAnimationFrame(loop)

  // run resize handler to make sure everything initialized correctly
  device.handleChange()
}
export const test = cardViewer
