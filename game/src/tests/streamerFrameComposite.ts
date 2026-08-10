import device from '@opensky/shared/device'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { delayPromise } from '@opensky/shared/utils/async'
import { BaseCard, CardLibrary, Rarity } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Clock } from 'three'

import { time } from '~/animationTime'
import CardPopupAssemblage from '~/assemblages/CardPopupAssemblage'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import TransformComponent from '~/components/TransformComponent'
import {
  ARENA_ANGLE,
  elementsArr,
  manaCostCompositeNudge,
  prismsArr
} from '~/constants'
import { cardArtFolder } from '~/helpers/cardArtHelpers'
import { RarityStrings } from '~/helpers/typeHelpers'
import { createWorldEntity, removeWorldEntity } from '~/helpers/worldHelpers'
import { getCardAssetString } from '~/materials'
import renderer from '~/renderer'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import keyboard from '~/systems/input/keyboard'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import UpdateManager from '~/systems/UpdateManager'
import { cameraShaker } from '~/utils/cameraShaker'
import { setCanvasSize } from '~/utils/canvasUtils'
import { getFakeCardTagView } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import { nextFrameUpdate } from '~/utils/onNextFrame'
import { taskTimer } from '~/utils/taskTimer'

import * as composite from '../scenes/composite'
import { world } from '../world'

async function streamerFrameComposite() {
  composite.initScene()
  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  manaCostCompositeNudge.set(0.00015, -0.0001)

  setCanvasSize('553px', '850px')

  TransformComponent.defaultScene = composite.scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrameStyleSystem())

  const clock = new Clock()
  const cardViews = [...CardLibrary.keys()]
    .sort((a, b) => Number(a) - Number(b))
    .map(id => getFakeCardTagView(id, 'base'))
  let cardEntity: Entity<Components>

  let cardId = getCardIdFromHash() || cardViews[0].base
  let prismId = prismsArr[0]
  let elementId = elementsArr[0]
  let cardIdx = 0
  let frameStyleIdx = RarityStrings.indexOf(getCardFrameStyleFromHash())
  let shouldExport = false
  let exportResolver: any

  globalAccess.compositeMode = 'streamer'

  const handleCardUpdate = () => {
    const newView = cardViews[10]
    elementId = getFromArrayWrapped(elementsArr, ~~(cardIdx / prismsArr.length))
    prismId = getFromArrayWrapped(prismsArr, cardIdx)
    newView.state.view.element = elementId
    newView.state.view.prism = prismId
    newView.state.view.rarity = getFromArrayWrapped(
      RarityStrings,
      frameStyleIdx
    )
    cardId = newView.base
    if (cardEntity) {
      removeWorldEntity(cardEntity.id)
    }
    cardEntity = createWorldEntity(CardPopupAssemblage(newView, 0))

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

  keyboard.listenToKey('Enter', () => (shouldExport = true))
  keyboard.listenToKey('ArrowLeft', () => {
    cardIdx -= 1
    handleCardUpdate()
  })
  keyboard.listenToKey('ArrowRight', () => {
    cardIdx += 1
    handleCardUpdate()
  })
  keyboard.listenToKey('ArrowUp', () => {
    frameStyleIdx -= 1
    handleCardUpdate()
  })
  keyboard.listenToKey('ArrowDown', () => {
    frameStyleIdx += 1
    handleCardUpdate()
  })

  window.onhashchange = () => {
    frameStyleIdx = RarityStrings.indexOf(getCardFrameStyleFromHash())

    const id = getCardIdFromHash()
    if (id) {
      setCard(id)
    }
  }

  // Expose export method on window for asset-pipeline task
  window.exportCanvasData = () =>
    new Promise(resolve => {
      exportResolver = resolve
      shouldExport = true
    })

  const exportPNG = async () => {
    shouldExport = false

    const { artSlug, backgroundArtSlug, attachment, type } =
      CardLibrary.get(cardId)!

    const bgUrl = `game/cards/art-full/bgs/${backgroundArtSlug}.png`
    const fgUrl = `game/cards/art-full/${cardArtFolder[type]}s/${artSlug}.png`

    await getAssetsManager().load('texture', bgUrl)
    await getAssetsManager().load('texture', fgUrl)

    if (attachment) {
      const attachementUrl = `game/cards/art-full/spells/${getCardAssetString(
        attachment
      )}.png`
      await getAssetsManager().load('texture', attachementUrl)
    }

    await delayPromise(100)

    render()

    const data = renderer.domElement.toDataURL()

    if (exportResolver) {
      exportResolver(data)
    } else {
      const a = document.createElement('a')
      a.href = data.replace('image/png', 'image/octet-stream')
      a.download = `${prismId}-${elementId}-${getFromArrayWrapped(
        RarityStrings,
        frameStyleIdx
      )}.png`
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

    if (composite.scene) {
      composite.scene.updateMatrixWorld(false)
    }

    // Render Arena
    composite.renderScene(renderer)
  }

  const loop = () => {
    render()

    if (shouldExport) {
      exportPNG()
    }

    requestAnimationFrame(loop)
  }

  // Start loop
  requestAnimationFrame(loop)

  // run resize handler to make sure everything initialized correctly
  device.handleChange()
}

const getCardIdFromHash = () => {
  const value = location.hash.replace(/^#/, '')
  return value ? (value.split('-')[0] as BaseCard) : undefined
}

const getCardFrameStyleFromHash = () => {
  const value = location.hash.replace(/^#/, '')
  return (value.split('-')[1] || 'base') as Rarity
}
export const test = streamerFrameComposite
