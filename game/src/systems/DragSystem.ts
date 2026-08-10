import device from '@opensky/shared/device'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Entity, System } from 'gg'

import { getCardCache } from '~/cardCache'
import { Components } from '~/components'
import ColliderActiveComponent from '~/components/ColliderActiveComponent'
import DraggingComponent from '~/components/DraggingComponent'
import { attemptToModifyIndicator } from '~/components/InteractiveIndicatorsComponent'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import TargetableComponent from '~/components/TargetableComponent'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import {
  clearAllPreviews,
  getCurrentPreview,
  setCurrentPreview
} from '~/helpers/previewHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { store } from '~/state'
import { setNextMouseCursor } from '~/utils/cursorUtils'

import DragStateMachine from './DragStateMachine'
import { dragCollections } from './dragUtils'
import { CursorType } from './input/CursorType'
import GeneralInput from './input/GeneralInput'
import { underPointer } from './input/input'
import { shouldPointerBeOffsetUp } from './input/shouldPointerBeOffsetUp'

const colliderActiveAndNotAnimating = ColliderActiveComponent.entities.exclude(
  IsAnimatingComponent.entities
)
type E = Entity<Components>

export default class DragSystem extends System<Components> {
  isPianoRolling = false
  private _defaultPointer: CursorType = 'default'
  private _stateMachine: DragStateMachine

  constructor(
    private _inputProvider: GeneralInput,
    defaultDropTarget: E
  ) {
    super()
    this._stateMachine = new DragStateMachine(
      this._inputProvider,
      defaultDropTarget
    )
  }

  init() {
    if (device.isMobile) {
      function onDraggingComponentChange() {
        shouldPointerBeOffsetUp.value = DraggingComponent.entities.length > 0
      }
      DraggingComponent.entities.listenForAdd(onDraggingComponentChange)
      DraggingComponent.entities.listenForRemove(onDraggingComponentChange)
    }

    const sm = this._stateMachine
    underPointer.addRoot3D(colliderActiveAndNotAnimating)

    dragCollections.indicatablePlayable.listenForAdd(entity => {
      if (dragCollections.indicatablePlayableDragging.length > 0) {
        return
      }
      entity.get('interactiveIndicators').playableState.value = true
    })
    dragCollections.indicatablePlayable.listenForRemove(entity => {
      if (dragCollections.indicatablePlayableDragging.length > 0) {
        return
      }
      if (entity.has('interactiveIndicators')) {
        entity.get('interactiveIndicators').playableState.value = false
      }
    })

    dragCollections.indicatablePlayableDragging.listenForAdd(draggingEntity => {
      for (const entity of dragCollections.indicatablePlayable.items) {
        if (entity === draggingEntity) {
          continue
        }
        entity.get('interactiveIndicators').playableState.value = false
      }
    })
    dragCollections.indicatablePlayableDragging.listenForRemove(() => {
      for (const entity of dragCollections.indicatablePlayable.items) {
        if (entity.has('interactiveIndicators')) {
          entity.get('interactiveIndicators').playableState.value =
            dragCollections.indicatablePlayable.items.includes(entity)
        }
      }
    })

    dragCollections.targetableEntities.listenForAdd(entity => {
      if (entity.has('interactiveIndicators')) {
        entity.get('interactiveIndicators').targetableState.value = true
      }
    })
    dragCollections.targetableEntities.listenForRemove(entity => {
      if (entity.has('interactiveIndicators')) {
        entity.get('interactiveIndicators').targetableState.value = false
      }
    })

    function onDropTargetStart(entity: E) {
      entity.add(new TargetableComponent())
    }

    function onDropTargetEnd(entity: E) {
      entity.remove('targetable')
      entity.remove('damageIndicator')
    }

    DraggingComponent.entities.listenForAdd(entity => {
      entity
        .get('draggable')
        .startListeningForDropTargets(onDropTargetStart, onDropTargetEnd)
    })
    DraggingComponent.entities.listenForRemove(entity => {
      entity.get('draggable').stopListeningForDropTargets()
    })

    store.subscribeToStateChanges(clearAllPreviews)

    if (getCardCache()) {
      getCardCache().subscribe(() => {
        const { hoverer, hoveree } = getCurrentPreview()
        clearAllPreviews()
        setCurrentPreview(hoverer, hoveree)
      })
    } else {
      console.warn('cardCache not available')
    }

    listenToProperty(
      sm.data,
      'isPianoRolling',
      state => (this.isPianoRolling = state)
    )

    function updatePreview() {
      setCurrentPreview(sm.data.activeEntity, sm.data.targetEntity)
    }
    listenToProperty(sm.data, 'activeEntity', updatePreview)
    DraggingComponent.entities.listenForAdd(entity => {
      if (entity.has('interactiveIndicators')) {
        entity.get('interactiveIndicators').draggingState.value = true
        // entity.get('interactiveIndicators').targetlessState.value = !entity.has('arrow')
      }
    })
    DraggingComponent.entities.listenForRemove(entity => {
      if (entity.has('interactiveIndicators')) {
        entity.get('interactiveIndicators').draggingState.value = false
        entity.get('interactiveIndicators').targetlessState.value = false
      }
    })
    listenToProperty(sm.data, 'targetEntity', updatePreview)

    this._inputProvider.onSelect.addListener((x, y) => {
      underPointer.testHit(x, y, entity => {
        if (entity.has('selectable')) {
          entity.get('selectable').onSelect(entity)
          if (entity.has('interactiveIndicators')) {
            entity.get('interactiveIndicators').selectedState.pulse()
          }
          return true
        }
        return false
      })
    })

    const onAltAction = (x: number, y: number) => {
      underPointer.testHit(x, y, entityToHold => {
        if (entityToHold.has('holdable')) {
          const holdable = entityToHold.get('holdable')
          attemptToModifyIndicator(
            entityToHold,
            ii => (ii.holdingState.value = true)
          )
          holdable.onHold(entityToHold)
          if (entityToHold.has('hero')) {
            sm.changeState('reading')
          }
          const onAltActionDone = () => {
            attemptToModifyIndicator(
              entityToHold,
              ii => (ii.holdingState.value = false)
            )
            holdable.onHoldCancel(entityToHold)
            this._inputProvider.onHoldEnd.removeListener(onAltActionDone)
            this._inputProvider.onRightPressEnd.removeListener(onAltActionDone)
          }
          this._inputProvider.onHoldEnd.addListener(onAltActionDone)
          this._inputProvider.onRightPressEnd.addListener(onAltActionDone)
          return true
        }
        return false
      })
    }
    this._inputProvider.onHoldStart.addListener(onAltAction)
    this._inputProvider.onRightPressStart.addListener(onAltAction)
    if (device.isDesktop) {
      this._inputProvider.onPressStart.addListener(() => {
        setHoveredCardAsync(undefined)
      })
    }
  }

  update() {
    const draggingEntities = ownedZoneCollections.Player_Dragging.items
    this._defaultPointer = draggingEntities.length > 0 ? 'grabbing' : 'default'
    const e = this._stateMachine.data.interestingEntity
    setNextMouseCursor(
      e && e.has('draggable') && e.get('draggable').dropTargets.items.length > 0
        ? 'grab'
        : e && e.has('selectable') && !this._stateMachine.data.isPressed
        ? 'pointer'
        : e && e.has('inspectable') && !this._stateMachine.data.isPressed
        ? 'help'
        : this._defaultPointer
    )
  }
}
