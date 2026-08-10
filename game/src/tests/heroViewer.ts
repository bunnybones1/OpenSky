import { BASE_HERO_SKINS, HeroSkin } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import {
  getLocalStorageFloat,
  setLocalStorageFloat
} from '@opensky/shared/utils/localStorage'
import { wrap } from '@opensky/shared/utils/math'

import { createHeroCardInteractives } from '~/assemblages/HeroCardAssemblage'
import { getAssetsManager } from '~/assets'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import HeroCardComponent from '~/components/HeroCardComponent'
import TransformComponent from '~/components/TransformComponent'
import { ARENA_ANGLE } from '~/constants'
import { createHeroCard } from '~/factories/HeroCardFactory'
import { ArcHelper } from '~/helpers/ArcHelper'
import { scene } from '~/scenes/arena/scene'
import { Easing } from '~/systems/animation/Easing'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import FrameStyleSystem from '~/systems/FrameStyleSystem'
import inputProvider from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import UpdateManager from '~/systems/UpdateManager'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { updateInteractivesForHeroCard } from '~/utils/helpers/HeroCardInteractivesHelpers'

import { world } from '../world'

const SCROLL_KEY = 'card-viewer-scroll'

async function heroViewer() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  TransformComponent.defaultScene = scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrameStyleSystem())

  const heroSkins: HeroSkin[] = [
    ...Object.values(BASE_HERO_SKINS),
    ...[...new Set([...HeroSkinLibrary.values()])]
  ]

  const virtualPageTracker = new Map<number, number>()

  const CARDS_IN_CAROUSEL = 9

  const cardsEntities = heroSkins
    .slice(0, CARDS_IN_CAROUSEL)
    .map((skin, idx) => {
      const card = createHeroCard(skin)
      updateInteractivesForHeroCard(card, createHeroCardInteractives)
      virtualPageTracker.set(idx, 0)
      card.get('transform').rotation.order = 'YXZ'
      return card
    })

  const arc = new ArcHelper()
  arc.p1.set(-0.14, 0.28 * 0.95, 0.4 * 0.95)
  arc.p2.set(0, 0.3, 0.4)
  arc.p3.set(0.14, 0.28 * 0.95, 0.4 * 0.95)
  arc.position.y += -0.04
  arc.position.z += 0.05
  arc.updateMatrixWorld(true)

  const total = cardsEntities.length

  let scrollOffset = getLocalStorageFloat(SCROLL_KEY, 0)
  setInterval(() => {
    setLocalStorageFloat(SCROLL_KEY, scrollOffset)
  }, 2000)
  let holding = false
  let scroller = 0
  const scrollerHistory = [0, 0, 0, 0, 0]
  const majority = ~~(scrollerHistory.length * 0.7)
  let scrollerHistoryIndex = 0
  let scrollerEcho = 0
  let lastX = 0
  inputProvider.onPressStart.addListener(x => {
    holding = true
    lastX = x
  })
  inputProvider.onPressEnd.addListener(() => {
    holding = false
    scrollerEcho =
      scrollerHistory
        .sort((a, b) => Math.abs(b) - Math.abs(a))
        .slice(0, majority)
        .reduce((a, b) => a + b, 0) / majority
    for (let i = 0; i < scrollerHistory.length; i++) {
      scrollerHistory[i] = 0
    }
  })
  inputProvider.onMove.addListener(x => {
    if (holding) {
      scroller += x - lastX
      lastX = x
    }
  })
  const update = (dt: number) => {
    let scrollAmt: number = 0
    if (scroller === 0 && !holding) {
      scrollAmt = scrollerEcho
      const ratio = 60 * dt
      const mixAmt = Math.pow(holding ? 0.8 : 0.99, ratio)
      scrollerEcho *= mixAmt
    } else {
      scrollAmt = scroller
      scrollerHistory[scrollerHistoryIndex++ % scrollerHistory.length] =
        scroller
      scroller = 0
    }
    scrollOffset -= (scrollAmt / renderMetrics.width) * 0.5
    cardsEntities.forEach((entity, idx) => {
      const oldPage = virtualPageTracker.get(idx)
      const virtualPosition = -scrollOffset + (idx + 0.5) / total - 1
      const ratio = wrap(virtualPosition, 0, 1)
      const newPage = -Math.round(virtualPosition + 0.5)
      const transform = entity.get('transform')
      transform.rotation.x = ARENA_ANGLE
      transform.rotation.z = (Easing.Cubic.InOut(ratio) - 0.5) * 1.5
      transform.rotation.y = -(Easing.Cubic.InOut(ratio) - 0.5)
      transform.position.copy(arc.sample(Easing.Sinusoidal.InOut(ratio)))
      if (oldPage !== newPage) {
        const cardIndex = newPage * total + idx
        entity.remove('heroCard')
        entity.remove('frameStyle')
        const newHeroSkin = getFromArrayWrapped(heroSkins, cardIndex)
        entity.add(new HeroCardComponent(newHeroSkin))
        entity.add(new FrameStyleComponent(newHeroSkin.grade))
        console.log(
          `idx:${idx}, page:${newPage} = ${heroSkins.indexOf(newHeroSkin)}`
        )
        updateInteractivesForHeroCard(entity, createHeroCardInteractives)
        virtualPageTracker.set(idx, newPage)
      }
    })
  }
  update(0)

  UpdateManager.register({
    update
  })
}

export const test = heroViewer
