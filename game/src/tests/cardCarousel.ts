import { i18nInit, isSupportedLanguage } from '@opensky/language-manager'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import {
  getLocalStorageFloat,
  setLocalStorageFloat
} from '@opensky/shared/utils/localStorage'
import { wrap } from '@opensky/shared/utils/math'
import { CardLibrary } from '@skyweaver/state-metadata'
import { Euler, Quaternion } from 'three'

import { getAssetsManager } from '~/assets'
import CardComponent from '~/components/CardComponent'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import FakeHasAttachmentComponent from '~/components/FakeHasAttachmentComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import TransformComponent from '~/components/TransformComponent'
import { ARENA_ANGLE } from '~/constants'
import env from '~/env'
import { createCard } from '~/factories/CardFactory'
import { createCharacter } from '~/factories/CharacterFactory'
import { ArcHelper } from '~/helpers/ArcHelper'
import { getOwner } from '~/helpers/cardHelpers'
import { tryAttachBakedAttachedSpell } from '~/helpers/fakeAttachedSpellHelper'
import { registerParallaxListener } from '~/helpers/parallaxHelpers'
import queryParams from '~/queryParams'
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
import { useParallaxOnCardInspector } from '~/userSettings'
import { getFakeCardTagView } from '~/utils/card'
import { getQuatFromEuler } from '~/utils/threeMathUtils'
import { findObject3DByName } from '~/utils/threeUtils'
import { world } from '~/world'

const SCROLL_KEY = 'card-viewer-scroll'

const __tempQuat = new Quaternion()
const __tempEuler = new Euler()
__tempEuler.order = 'YXZ'

export async function cardCarousel(useCharacters = false) {
  const islandTest = new BasicIslandTest()
  await islandTest.init()

  await i18nInit({
    defaultNS: 'game',
    lng:
      queryParams.language && isSupportedLanguage(queryParams.language)
        ? queryParams.language
        : 'en',
    version: env.GITCOMMIT
  })

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  TransformComponent.defaultScene = scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrameStyleSystem())

  const rope = findObject3DByName(scene, 'field-rope', true)
  rope.visible = false

  const supportedRarities = ['base', 'silver', 'gold'] as const
  const rarities = (queryParams.rarities || 'base')
    .split(',')
    .filter(v =>
      supportedRarities.includes(v as (typeof supportedRarities)[number])
    ) as Array<(typeof supportedRarities)[number]>

  const cardViews = [...CardLibrary.keys()]
    .map(id => {
      return rarities.map(r => {
        const view = getFakeCardTagView(id, r)
        view.state.view.rarity = r
        return view
      })
    })
    .reduce((acc, val) => acc.concat(val), [])
    .filter(c => !useCharacters || c.state.view.type === 'unit')

  const virtualPageTracker = new Map<number, number>()

  const CARDS_IN_CAROUSEL = 9

  const cardsEntities = cardViews
    .slice(0, CARDS_IN_CAROUSEL)
    .map((view, idx) => {
      let card
      if (useCharacters) {
        card = createCharacter(view)
      } else {
        card = createCard(view, true)
      }
      if (!card.has('frontFacesVisible')) {
        card.add(new FrontFacesVisibleComponent())
      }
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

  const update = (dt: number) => {
    let scrollAmt = 0
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
      __tempEuler.set(
        ARENA_ANGLE,
        -(Easing.Cubic.InOut(ratio) - 0.5),
        (Easing.Cubic.InOut(ratio) - 0.5) * 1.5
      )
      __tempQuat.setFromEuler(__tempEuler)
      transform.quaternion.copy(__tempQuat)
      __tempQuat.multiply(_tilt)
      transform.quaternion.slerp(
        __tempQuat,
        Math.max(0.0, 1.0 - Math.abs(ratio - 0.5) * 6.0)
      )
      transform.position.copy(arc.sample(Easing.Sinusoidal.InOut(ratio)))
      if (oldPage !== newPage) {
        const cardIndex = newPage * total + idx
        entity.remove('card')
        entity.remove('cardInstance')
        entity.remove('fakeHasAttachment')
        const newView = getFromArrayWrapped(cardViews, cardIndex)
        entity.add(new CardComponent())
        if (newView.attachment !== undefined) {
          entity.toggle(FakeHasAttachmentComponent, true)
        }
        entity.add(new CardInstanceComponent(newView))
        console.log(
          `idx:${idx}, page:${newPage} = ${cardViews.indexOf(newView)}`
        )
        if (!useCharacters) {
          tryAttachBakedAttachedSpell(
            newView,
            'fake',
            entity.get('transform'),
            entity.get('mesh'),
            getOwner(true)
          )
        }
        virtualPageTracker.set(idx, newPage)
      }
      const hidden = !entity.has('frontFacesVisible')
      entity.get('transform').traverse(obj => {
        if (obj.userData.isFrontFacing) {
          obj.visible = !hidden
        }
      })
    })
  }
  update(0)

  UpdateManager.register({
    update
  })
  return {
    cardsEntities,
    cardViews
  }
}

export const test = cardCarousel
