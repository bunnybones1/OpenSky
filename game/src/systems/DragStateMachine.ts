import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Entity } from 'gg'
import { Vector3 } from 'three'

import { COLOR_ARROW_YELLOW } from '~/colors/colorLibrary'
import { Components } from '~/components'
import ArrowComponent, {
  attemptToChangeArrowColor2
} from '~/components/ArrowComponent'
import AttachmentCancellerComponent from '~/components/AttachmentCancellerComponent'
import ColliderActiveComponent from '~/components/ColliderActiveComponent'
import DraggingComponent from '~/components/DraggingComponent'
import InspectingComponent from '~/components/InspectingComponent'
import StagingComponent from '~/components/StagingComponent'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { getHandDirection } from '~/utils/handedness'
import { NOOP } from '~/utils/jsUtils'
import {
  ReadonlyTrackableCollection,
  TrackableCollection
} from '~/utils/TrackableCollection'
import { world } from '~/world'

import {
  areEntitiesInSameZone,
  getEntityZone,
  isEntityInZone
} from './animation/zoneUtils'
import CardFocusInspectionSystem from './CardFocusInspectionSystem'
import { dragCollections, parentCardIfAttachedToHandCard } from './dragUtils'
import GeneralInput from './input/GeneralInput'
import { underPointer } from './input/input'

const __origin = new Vector3(0, 0, 0)

const HOVER_CARD_DELAY_ON_FIELD = 0.75
const HOVER_CARD_ATTACHMENT = 0.75
const HOVER_CARD_DELAY_ON_HAND = device.isMobile ? 0.05 : 0

type E = Entity<Components>

type NE = E | undefined

const NONE = new TrackableCollection<E>('none')
class DragData {
  collidableItems: ReadonlyTrackableCollection<E> = NONE
  isPressed: boolean
  isRightPressed: boolean
  isPianoRolling: boolean
  interestingEntity: NE
  activeEntity: NE
  dragStartEntity: NE
  targetEntity: NE
}

type DragStateDispose = () => void

type DragStateInit = (stateMachine: DragStateMachine) => DragStateDispose

type DragStates = 'doingNothing' | 'reading' | 'targetting' | 'submittingAction' // | 'aimingHandSpell' | 'aimingHandUnit'

const __stateLib: { [K in DragStates]: DragStateInit } = {
  reading: function (sm) {
    setHoveredCardAsync(undefined)
    AttachmentCancellerComponent.removeFromAll()
    sm.data.activeEntity = undefined
    sm.data.targetEntity = undefined
    sm.data.dragStartEntity = undefined
    sm.data.collidableItems = dragCollections.interactiveEntities
    function onInterestingEntityChanged(e: NE) {
      if (e) {
        InspectingComponent.attachToJustOne(e)
      } else {
        InspectingComponent.removeFromAll()
      }
      if (e && e.has('frontFacesVisible')) {
        setHoveredCardAsync(
          e,
          isEntityInZone(e, 'Field')
            ? HOVER_CARD_DELAY_ON_FIELD
            : isEntityInZone(e, 'Hand')
            ? HOVER_CARD_DELAY_ON_HAND
            : isEntityInZone(e, 'Attachment')
            ? HOVER_CARD_ATTACHMENT
            : 0,
          e.get('transform').position.x > 0 ? 'left' : undefined
        )
      } else {
        setHoveredCardAsync(undefined)
      }
      sm.data.isPianoRolling = isEntityInZone(e, 'Hand')
    }
    function onEntityUnderPointerChanged(newE: NE, oldE: NE) {
      let newCardE = newE && newE.has('cardInstance') ? newE : undefined
      let oldCardE = oldE && oldE.has('cardInstance') ? oldE : undefined
      newCardE = parentCardIfAttachedToHandCard(newCardE)
      oldCardE = parentCardIfAttachedToHandCard(oldCardE)
      if (newCardE === oldCardE) {
        return
      }
      if (sm.data.isPressed) {
        let cardToTarget = newCardE
        if (
          (!areEntitiesInSameZone(newCardE, oldCardE) && oldCardE) ||
          !device.isMobile
        ) {
          cardToTarget = undefined
        }
        if (!cardToTarget) {
          const e2 = sm.data.interestingEntity
          if (e2 && !e2.has('isAnimating')) {
            sm.data.activeEntity = e2
            if (
              e2.has('playable') &&
              (isEntityInZone(e2, 'Hand') || sm.data.dragStartEntity === e2)
            ) {
              sm.data.interestingEntity = undefined
              InspectingComponent.removeFromAll()
              sm.changeState('targetting')
            } else {
              sm.data.targetEntity = undefined
              sm.changeState('submittingAction')
            }
            return
          }
        }
      }
      if (getEntityZone(newCardE) === 'CardSelection') {
        newCardE = undefined
      }
      sm.data.interestingEntity = newCardE
    }
    listenToProperty(
      sm.data,
      'interestingEntity',
      onInterestingEntityChanged,
      false
    )
    listenToProperty(underPointer, 'entity', onEntityUnderPointerChanged)

    return function cleanup() {
      stopListeningToProperty(
        sm.data,
        'interestingEntity',
        onInterestingEntityChanged
      )
      stopListeningToProperty(
        underPointer,
        'entity',
        onEntityUnderPointerChanged
      )
    }
  },

  targetting: function (sm) {
    let hideArrow = false
    if (sm.data.activeEntity && sm.data.activeEntity.has('hero')) {
      if (world.getSystem(CardFocusInspectionSystem).focusedPopupCards) {
        hideArrow = true
      }
    } else {
      world.getSystem(CardFocusInspectionSystem).setFocusedCard(null)
    }
    sm.data.isPianoRolling = false
    const activeE = sm.data.activeEntity!
    sm.data.collidableItems =
      activeE.has('draggable') &&
      activeE.get('draggable').dropTargets.items.includes(sm.defaultDropTarget)
        ? dragCollections.targetableOrHandEntities
        : dragCollections.targetableOrHandOrFieldEntities
    if (activeE.has('attachedTo')) {
      const hostE = activeE.get('attachedTo').entity
      hostE.add(new AttachmentCancellerComponent())
    }
    if (!activeE.has('zone')) {
      throw new Error('entity does not have a zone component')
    }
    const zone = activeE.get('zone')
    if (
      activeE.has('draggable') &&
      activeE.get('draggable').dropTargets.items.includes(sm.defaultDropTarget)
    ) {
      zone.setUserZone('Dragging')
    } else {
      if (zone.current.ownedCardStatus !== 'Player_Field') {
        if (activeE.get('cardInstance').state.view.type === 'heroAbility') {
          zone.setUserZone('HeroAbilityStaging')
        } else {
          zone.setUserZone('Staging')
          activeE.add(new StagingComponent())
        }
      }
      if (!hideArrow) {
        activeE.add(
          new ArrowComponent(
            activeE.get('transform'),
            activeE.get('interactiveIndicators').color
          )
        )
      }
    }

    const offset =
      activeE.has('draggable') && activeE.get('draggable').recenterOnDrag
        ? device.isMobile && !activeE.has('arrow')
          ? new Vector3(
              getHandDirection(
                (underPointer.lastX / renderMetrics.width) * 2 - 1
              ) * 0.035,
              0,
              0
            )
          : __origin
        : underPointer.worldPos.clone().sub(activeE.get('transform').position)
    activeE.add(
      new DraggingComponent(offset, underPointer.lastX, underPointer.lastY)
    )

    function onEntityUnderPointerChanged(e: E) {
      const cardE = e && e.has('cardInstance') ? e : undefined
      if (cardE) {
        if (isEntityInZone(cardE, 'Hand') && device.isMobile) {
          sm.data.interestingEntity = cardE
          sm.changeState('reading')
        }
      }
      if (e && e.has('colliderActive')) {
        sm.data.targetEntity = e
        attemptToChangeArrowColor2(
          activeE,
          e.get('interactiveIndicators').color
        )
      } else {
        sm.data.targetEntity = undefined
        attemptToChangeArrowColor2(activeE, COLOR_ARROW_YELLOW.clone())
      }
    }
    function onPressedChanged(pressed: boolean) {
      if (!pressed) {
        if (sm.data.activeEntity && sm.data.targetEntity) {
          sm.changeState('submittingAction')
        } else {
          sm.changeState('reading')
        }
      }
    }
    function onRightPressedChanged(pressed: boolean) {
      if (pressed) {
        playSound('audioFxCommon', 'CardSlip')
        const e = sm.data.activeEntity
        if (e && e.has('draggable')) {
          e.get('draggable').onDropCancel(e)
        }
        sm.changeState('reading')
      }
    }
    listenToProperty(sm.data, 'isRightPressed', onRightPressedChanged, false)
    listenToProperty(sm.data, 'isPressed', onPressedChanged, false)
    listenToProperty(underPointer, 'entity', onEntityUnderPointerChanged, true)

    return function cleanup() {
      const activeE = sm.data.activeEntity
      if (activeE) {
        activeE.remove('dragging')
        activeE.remove('staging')
        activeE.remove('arrow')
        if (activeE.has('zone')) {
          const zone = activeE.get('zone')
          zone.setUserZone('UseState')
        }
      }

      stopListeningToProperty(sm.data, 'isRightPressed', onRightPressedChanged)
      stopListeningToProperty(sm.data, 'isPressed', onPressedChanged)
      stopListeningToProperty(
        underPointer,
        'entity',
        onEntityUnderPointerChanged
      )
    }
  },

  submittingAction(sm) {
    if (sm.data.activeEntity && sm.data.targetEntity) {
      if (sm.data.activeEntity.has('draggable')) {
        sm.data.activeEntity
          .get('draggable')
          .onDrop(sm.data.activeEntity, sm.data.targetEntity)
      }
    } else if (sm.data.activeEntity && sm.data.activeEntity.has('draggable')) {
      sm.data.activeEntity.get('draggable').onDragStartWithoutTargets?.()
    }

    setTimeout(() => {
      sm.changeState('reading')
    }, 60)

    return NOOP
  },

  doingNothing: function () {
    return NOOP
  }
} as const

const __stateLibSafety: { [K: string]: DragStateInit } = __stateLib
void __stateLibSafety

function onAddToCollidables(val: E) {
  val.add(new ColliderActiveComponent())
}

function onRemoveFromCollidables(val: E) {
  val.remove('colliderActive')
}

export default class DragStateMachine {
  readonly data = new DragData()
  private _state: DragStateInit
  private _lastStateCleanup: (() => void) | undefined
  changeState(stateName: DragStates) {
    const state = __stateLib[stateName]
    if (state === this._state) {
      return
    }
    if (this._lastStateCleanup) {
      this._lastStateCleanup()
      this._lastStateCleanup = undefined
    }
    this._state = state
    if (this._state) {
      this._lastStateCleanup = this._state(this)
    }
  }
  constructor(
    inputProvider: GeneralInput,
    public defaultDropTarget: E
  ) {
    inputProvider.onPressStart.addListener(() => {
      this.data.isPressed = true
      this.data.dragStartEntity = underPointer.entity
    })
    inputProvider.onPressEnd.addListener(() => {
      this.data.isPressed = false
      this.data.dragStartEntity = undefined
    })

    inputProvider.onRightPressStart.addListener(() => {
      this.data.isRightPressed = true
    })
    inputProvider.onRightPressEnd.addListener(() => {
      this.data.isRightPressed = false
    })

    listenToProperty(this.data, 'targetEntity', (newE, oldE) => {
      if (oldE && oldE.has('interactiveIndicators')) {
        oldE.get('interactiveIndicators').hoveringState.value = false
      }
      if (newE && newE.has('interactiveIndicators')) {
        newE.get('interactiveIndicators').hoveringState.value = true
      }
    })
    listenToProperty(this.data, 'collidableItems', (newItems, oldItems) => {
      if (oldItems) {
        oldItems.stopListeningForAdd(onAddToCollidables)
        oldItems.stopListeningForRemove(onRemoveFromCollidables)
      }

      for (let i = ColliderActiveComponent.entities.length - 1; i >= 0; i--) {
        const item = ColliderActiveComponent.entities.items[i]
        if (!newItems.items.includes(item)) {
          item.remove('colliderActive')
        }
      }

      for (const item of newItems.items) {
        if (!item.has('colliderActive') && item.has('collidable')) {
          item.add(new ColliderActiveComponent())
        }
      }

      newItems.listenForAdd(onAddToCollidables, true)
      newItems.listenForRemove(onRemoveFromCollidables)
    })
    this._state = __stateLib.reading
    this._lastStateCleanup = this._state(this)
  }
}
