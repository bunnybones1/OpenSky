import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { clamp, lerp } from '@opensky/shared/utils/math'
import { isHero, isHeroAbility } from '@skyweaver/state-metadata'
import { Entity, EntityManager, System } from 'gg'
import { Mesh, Object3D, Quaternion } from 'three'

import { areCheatsEnabled, tryCreateCheatsContextMenu } from '~/cheats/cheats'
import { Components } from '~/components'
import CollidableComponent from '~/components/CollidableComponent'
import EmoteRingOpenComponent from '~/components/EmoteRingOpenComponent'
import HoldableComponent from '~/components/HoldableComponent'
import MuteEnemyRingOpenComponent from '~/components/MuteEnemyRingOpenComponent'
import SelectableComponent from '~/components/SelectableComponent'
import { ARENA_ANGLE } from '~/constants'
import { createCardPopupEntities } from '~/factories/CardPopupFactory'
import { ArcHelper } from '~/helpers/ArcHelper'
import { getOwner } from '~/helpers/cardHelpers'
import { inspectableZoneEntities } from '~/helpers/compoundCollections'
import { registerParallaxListener } from '~/helpers/parallaxHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { zoneCollections } from '~/helpers/zoneCollections'
import { scene } from '~/scenes/arena/scene'
import { UI } from '~/scenes/ui'
import { useParallaxOnCardInspector } from '~/userSettings'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { NOOP } from '~/utils/jsUtils'
import { getTempQuatFromEuler } from '~/utils/threeMathUtils'
import { findObject3DByName, isOrHasChild } from '~/utils/threeUtils'
import { world } from '~/world'

import {
  disableActionHistoryPopupManager,
  enableActionHistoryPopupManager
} from './ActionHistoryPopupManager'
import { Easing } from './animation/Easing'
import {
  disableCardPopupManager,
  enableCardPopupManager
} from './CardPopupManager'
import inputProvider, { underPointer } from './input/input'

const SCROLL_THRESHOLD = 75
const _tilt = new Quaternion()
const _tiltTemp = new Quaternion()

const focusableCards = inspectableZoneEntities.exclude(
  zoneCollections.OptimisticHand
)

export default class CardFocusInspectionSystem extends System<Components> {
  root = new Object3D()
  focusedPopupCards: Array<Entity<Components>> | null = null

  hoverArc: ArcHelper = new ArcHelper()
  currentlySnappedIndex = 0
  scrollOffset = 0

  isScrolling: NodeJS.Timeout | undefined
  scrollWheelPos = 0
  isHolding = false

  scroller = 0
  scrollerHistory = [0, 0, 0, 0, 0]
  scrollerHistoryIndex = 0
  scrollerEcho = 0
  lastX = 0
  showCardback = new AnimatedBool(NOOP, false, 250, Easing.Linear)

  private _active: boolean = false
  private _parallaxActive: boolean
  private _currentFocusedCards: Entity<Components>[] | undefined = undefined

  cardScale = new AnimatedBool(NOOP, false, 250, Easing.Custom.SuperFastOut, 10)
  relatedCardScale = new AnimatedBool(
    NOOP,
    false,
    250,
    Easing.Custom.SuperFastOut,
    10
  )
  set active(val: boolean) {
    if (this._active === val) {
      return
    }
    this._active = val
  }
  constructor(private ui: UI) {
    super()
  }

  init() {
    if (!device.isMobile) {
      this.root.scale.setScalar(0.95)
    }
    focusableCards.listenForAdd(c => {
      const handleCheats = (e: Entity<Components>) => {
        if (areCheatsEnabled()) {
          const card = e.get('cardInstance')
          const zone = e.get('zone').current.cardStatus
          tryCreateCheatsContextMenu(card, zone)
          return true
        }
        return false
      }

      const handleCardInspection = (e: Entity<Components>) => {
        if (this._active) {
          this.setFocusedCard(e)
          e.remove('inspecting')
        }
      }

      if (c.has('hero')) {
        c.add(
          new HoldableComponent(e => {
            if (!handleCheats(e)) {
              handleCardInspection(e)
            }
          }, NOOP)
        )

        c.add(
          new SelectableComponent(e => {
            const card = e.has('cardInstance')
              ? e.get('cardInstance')
              : undefined
            if (
              card &&
              card.state.view.type === 'hero' &&
              !e.has('emoteRingOpen') &&
              !e.has('muteEnemyRingOpen')
            ) {
              if (e.has('player')) {
                e.add(new EmoteRingOpenComponent())
              } else {
                e.add(new MuteEnemyRingOpenComponent())
              }
            }
          })
        )
      } else {
        c.add(new SelectableComponent(handleCardInspection))
        c.add(new HoldableComponent(handleCheats, NOOP))
      }
    })
    focusableCards.listenForRemove(c => {
      c.remove('selectable')
      c.remove('holdable')
    })

    this.hoverArc.p1.set(-0.08, 0.302, 0.4)
    this.hoverArc.p2.set(0, 0.31, 0.4)
    this.hoverArc.p3.set(0.08, 0.302, 0.4)
    this.hoverArc.position.y += -0.04
    this.hoverArc.position.z += 0.05
    this.hoverArc.updateMatrixWorld(true)

    scene.add(this.hoverArc)
    scene.add(this.root)
    // this.mode = 'tips'
    inputProvider.onWheel.addListener((deltaX, deltaY) => {
      if (!this.focusedPopupCards || !this._eatsMouseEvents()) {
        return
      }
      if (!this.isScrolling) {
        // first scroll event in timeout should always go one full tick
        this.scrollWheelPos = SCROLL_THRESHOLD * Math.sign(-deltaY + deltaX)
      } else {
        this.scrollWheelPos -= deltaY + deltaX
      }
      if (Math.abs(this.scrollWheelPos) >= SCROLL_THRESHOLD) {
        // scroll one card back/forth
        this.scrollOffset += Math.sign(this.scrollWheelPos)
        // reset scroll snap threshold
        this.scrollWheelPos -= SCROLL_THRESHOLD * Math.sign(this.scrollWheelPos)
      }

      // cancel any momentum
      this.scroller = 0
      if (this.isScrolling) {
        clearTimeout(this.isScrolling)
      }
      this.isScrolling = setTimeout(() => {
        this.isScrolling = undefined
      }, 100)
    })
    const majority = ~~(this.scrollerHistory.length * 0.7)

    inputProvider.onPressStart.addListener(x => {
      if (this._eatsMouseEvents()) {
        this.isHolding = true
        this.lastX = x
      }
    })
    inputProvider.onPressEnd.addListener(() => {
      this.isHolding = false
      this.scrollerEcho =
        this.scrollerHistory
          .sort((a, b) => Math.abs(b) - Math.abs(a))
          .slice(0, majority)
          .reduce((a, b) => a + b, 0) / majority
      for (let i = 0; i < this.scrollerHistory.length; i++) {
        this.scrollerHistory[i] = 0
      }
    })
    inputProvider.onMove.addListener(x => {
      if (this.isHolding) {
        this.scroller += x - this.lastX
        this.lastX = x
      }
    })
  }
  flipCards() {
    this.showCardback.value = !this.showCardback.value
  }

  setFocusedCard(cardEntity: Entity<Components> | Entity<Components>[] | null) {
    const container = this.ui.getContainer('cardFocusInspection')
    let cardEntityArray: Entity<Components>[] | null
    if (cardEntity) {
      cardEntityArray = cardEntity instanceof Entity ? [cardEntity] : cardEntity
    } else {
      cardEntityArray = null
    }
    if (this.focusedPopupCards) {
      playSound('audioFxCommon', 'BoxClose')
      for (const card of this.focusedPopupCards) {
        removeWorldEntity(card.id)
      }
      this.focusedPopupCards = null
    }

    if (cardEntityArray) {
      this.cardScale.value = true
      this.relatedCardScale.animateValue(true, 300, undefined, 150)
    } else {
      this.cardScale.value = false
      this.relatedCardScale.value = false
    }

    if (!cardEntityArray || this._currentFocusedCards === cardEntityArray) {
      this._currentFocusedCards = undefined
      container.ready.then(container => container.hide())
      enableCardPopupManager()
      enableActionHistoryPopupManager()
      return
    }

    this._currentFocusedCards = cardEntityArray

    if (useParallaxOnCardInspector.value && !this._parallaxActive) {
      this._parallaxActive = true
      registerParallaxListener(q => {
        _tilt.copy(q)
      })
    }

    this.currentlySnappedIndex = -1

    playSound('audioFxCommon', 'Click1')

    disableCardPopupManager()
    disableActionHistoryPopupManager()
    container.ready.then(container => container.show())
    this.focusedPopupCards = []
    for (cardEntity of cardEntityArray) {
      const card = cardEntity.get('cardInstance')
      const owner = getOwner(cardEntity.has('player'))
      const attachmentEntity = cardEntity.has('hostingAttachment')
        ? cardEntity.get('hostingAttachment').entity
        : undefined
      const attachment =
        attachmentEntity && attachmentEntity.has('cardInstance')
          ? attachmentEntity.get('cardInstance')
          : undefined
      this.focusedPopupCards.push(
        ...createCardPopupEntities(
          card,
          attachment,
          owner,
          cardEntity.has('playable'),
          Infinity
        )
      )
    }
    for (const entity of this.focusedPopupCards) {
      const zone = entity.get('zone')
      zone.setUserZone('Inspection')
      zone.setOwner(entity.has('player') ? 'Player' : 'Opponent')

      const card = entity.get('cardInstance')

      const colliderMesh = findObject3DByName<Mesh>(
        entity.get('mesh'),
        isHero(card)
          ? 'heroCard-collider'
          : isHeroAbility(card)
          ? 'hero-ability-collider'
          : 'card-collider'
      )
      entity.add(new CollidableComponent(entity.get('mesh'), colliderMesh))

      entity.add(
        new SelectableComponent(() => {
          if (!this.focusedPopupCards) {
            return
          }
          const index = this.focusedPopupCards.indexOf(entity)
          if (index !== undefined && index !== -1) {
            const newScrollOffset =
              (-index + (this.focusedPopupCards.length - 1) / 2) * 1.001

            if (Math.abs(this.scrollOffset - newScrollOffset) > 0.01) {
              this.scrollOffset = newScrollOffset
            } else {
              this.setFocusedCard(null)
            }
          }
        })
      )
    }
    this.root.add(...this.focusedPopupCards.map(e => e.get('transform')))

    this.scrollOffset = this.focusedPopupCards.length / 2

    const card = cardEntityArray[0].get('cardInstance')
    const owner = getOwner(cardEntityArray[0].has('player'))
    container.setTicks(this.focusedPopupCards.length)
    container.createInfoBoxes(card, card.base === 'Hero' ? owner : undefined)
    this.showCardback.value = false
    this.update(world.manager, 0)
  }

  private _eatsMouseEvents() {
    const container = this.ui.getContainer('cardFocusInspection')
    return (
      this.focusedPopupCards?.includes(underPointer.entity!) ||
      (underPointer.collider2D?.parent &&
        isOrHasChild(container, underPointer.collider2D.parent))
    )
  }

  disable() {
    super.disable()
    this.setFocusedCard(null)
  }

  update(manager: EntityManager<Components>, dt: number) {
    if (!this.focusedPopupCards) {
      return
    }
    const total = this.focusedPopupCards.length

    let scrollAmt: number = 0
    const wheelOrHolding = this.isScrolling || this.isHolding
    if (this.scroller === 0 && !wheelOrHolding) {
      const ratio = 200 * dt
      const mixAmt = Math.pow(wheelOrHolding ? 0.8 : 0.99, ratio)
      this.scrollerEcho *= mixAmt
    } else {
      scrollAmt = this.scroller * 2.5
      this.scrollerHistory[
        this.scrollerHistoryIndex++ % this.scrollerHistory.length
      ] = this.scroller
      this.scroller = 0
    }

    const halfTotal = (total - 1) / 2

    const modDiff = ((1 - total) / 2) % 1
    // * 0.999 to make sure we don't snap to edges by rounding error
    const nearestSnapPoint =
      Math.round(
        clamp(this.scrollOffset, -halfTotal, halfTotal) * 0.999 - modDiff
      ) + modDiff

    const newSnapIndex = total - 1 - (nearestSnapPoint + total / 2 - 0.5)
    if (this.currentlySnappedIndex !== newSnapIndex) {
      const e = this.focusedPopupCards[newSnapIndex]
      const card = e.get('cardInstance')
      const owner = getOwner(e.has('player'))

      const container = this.ui.getContainer('cardFocusInspection')
      container.setSelectedTick(newSnapIndex)
      container.createInfoBoxes(card, card.base === 'Hero' ? owner : undefined)
    }
    this.currentlySnappedIndex = newSnapIndex

    const nearestDiff = this.scrollOffset - nearestSnapPoint
    if (!wheelOrHolding && Math.abs(nearestDiff) > 0.001) {
      const amt =
        Math.pow(Math.min(Math.max(Math.abs(nearestDiff), 0.001), 0.1), 1.5) *
        Math.sign(nearestDiff) *
        renderMetrics.width
      scrollAmt -= amt
    }

    this.scrollOffset += (scrollAmt / renderMetrics.width) * 2

    // clamp again to fix momentum scrolling
    this.scrollOffset = clamp(this.scrollOffset, -halfTotal, halfTotal)

    this.focusedPopupCards.forEach((entity, idx) => {
      const x = idx + 0.5 + this.scrollOffset
      const ratio = x / total
      const transform = entity.get('transform')
      // transform.rotation.x = ARENA_ANGLE
      transform.rotation.y = -(ratio - 0.5) * 0.15
      transform.rotation.z =
        entity.has('heroCard') || entity.has('heroAbility')
          ? (Easing.Cubic.InOut(ratio) - 0.5) * 0.3
          : lerp(
              (Easing.Cubic.InOut(ratio) - 0.5) * 0.3,
              Math.PI,
              this.showCardback.animatedValue
            )

      const scaler = idx === 0 ? this.cardScale : this.relatedCardScale
      transform.scale.setScalar(
        (1 - Math.abs((ratio - 0.5) * 0.5)) * scaler.animatedValue
      )

      const cardBack = transform.getObjectByName('card-back')
      if (cardBack) {
        cardBack.scale.y =
          Easing.Quadratic.In(this.showCardback.animatedValue) * 1.2 + 0.0001
      }
      // see https://www.desmos.com/calculator/3ksgr5rpae
      const powerCurveMirroredAtHalf =
        Math.sign(ratio - 0.5) *
          (Math.pow(Math.abs(ratio - 0.5) + 1, 0.2) - 1) +
        0.5
      transform.position.copy(this.hoverArc.sample(powerCurveMirroredAtHalf))
      transform.position.x *= total * 1.7 * lerp(0.33, 1, scaler.animatedValue)
      _tiltTemp
        .identity()
        .slerp(_tilt, (0.1 - Math.abs(transform.position.x)) * -1.5)
      // const e = new Euler()
      // e.setFromQuaternion(_tiltTemp)
      // transform.rotation.x += e.x
      // transform.rotation.y += e.y
      // transform.rotation.order = 'YXZ'
      // const e = getTempEulerFromQuat(_tiltTemp)
      // e.z *= -1

      transform.quaternion
        .copy(
          getTempQuatFromEuler(
            -Math.PI * 0.5,
            transform.rotation.y,
            transform.rotation.z
          )
        )
        .premultiply(_tiltTemp)
        .premultiply(getTempQuatFromEuler(Math.PI * 0.5, 0, 0))
        .premultiply(getTempQuatFromEuler(ARENA_ANGLE, 0, 0))
    })
  }
}
