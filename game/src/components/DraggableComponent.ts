import { Component, Entity, EntityChangeEvent } from 'gg'
import { Vector3 } from 'three'

import { ActiveCollection } from '~/utils/ActiveCollection'

import { Components } from '.'
import CollidableComponent from './CollidableComponent'

type E = Entity<Components>
class Draggable {
  readonly dropTargets: ActiveCollection<E>
  readonly secondaryDropTargets: E[] = []
  private _frame: E[] = []
  private _onItemActivated: ((item: E) => void) | undefined
  private _onItemDeactivated: ((item: E) => void) | undefined
  private _hasListeners = false
  private _entityChangeListenerKillers: Array<() => boolean>
  constructor(
    readonly home: Vector3,
    readonly recenterOnDrag: boolean,
    readonly onDrop: (dropped: E, droppedOnto: E) => void,
    readonly onDropCancel: (dropped: E) => void,
    public onDragStartWithoutTargets?: () => void
  ) {
    this.dropTargets = new ActiveCollection<E>(
      this._itemActivated,
      this._itemDeactivated
    )
  }

  startListeningForDropTargets(
    onItemActivated: (item: E) => void,
    onItemDeactivated: (item: E) => void
  ) {
    if (this._hasListeners) {
      console.error('Only one set of listeners at a time')
      return
    }
    this._onItemActivated = onItemActivated
    this._onItemDeactivated = onItemDeactivated
    this.dropTargets.items.forEach(this._itemActivated)
    this._entityChangeListenerKillers = this.dropTargets.items.map(ent =>
      ent.onChange(this._onPotentialCollidableChange)
    )
    this._hasListeners = true
  }

  stopListeningForDropTargets() {
    if (!this._hasListeners) {
      console.error('No one was listening')
      return
    }
    this.dropTargets.items.forEach(this._itemDeactivated)
    this._onItemActivated = undefined
    this._onItemDeactivated = undefined
    for (const kill of this._entityChangeListenerKillers) {
      kill()
    }
    this._entityChangeListenerKillers.length = 0
    this._hasListeners = false
  }

  startNewFrame() {
    this.secondaryDropTargets.length = 0
    this._frame.length = 0
  }

  addDropTargetToFrame(item: E) {
    this._frame.push(item)
  }

  finalizeFrame() {
    this.dropTargets.collect(add => {
      for (const item of this._frame) {
        add(item)
      }
    })
  }

  private _onPotentialCollidableChange = (
    ev: EntityChangeEvent<Components>
  ) => {
    if (ev.component instanceof CollidableComponent) {
      if (ev.type === 'add') {
        this._itemActivated(ev.entity)
      } else {
        this._itemDeactivated(ev.entity)
      }
    }
  }

  private _itemActivated = (item: E) => {
    if (this._onItemActivated) {
      this._onItemActivated(item)
    }
  }

  private _itemDeactivated = (item: E) => {
    if (this._onItemDeactivated) {
      this._onItemDeactivated(item)
    }
  }
}
export default class DraggableComponent extends Component<Draggable> {
  constructor(
    home: Vector3,
    recenterOnDrag: boolean,
    onDrop: (dropped: E, droppedOnto: E) => void,
    onDropCancel: (dropped: E) => void,
    onDragStartWithoutTargets?: () => void
  ) {
    super(
      new Draggable(
        home,
        recenterOnDrag,
        onDrop,
        onDropCancel,
        onDragStartWithoutTargets
      )
    )
  }
}
