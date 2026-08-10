import { Component, Entity } from 'gg'
import { Vector2, Vector3 } from 'three'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

const __minPixelsToMove = -1
const __tempVec = new Vector2()

interface DraggingValue {
  dragOffset: Vector3
  dampenedDelta: Vector3
  startPixel: Vector2
  farEnough: (x: number, y: number) => boolean
}

export default class DraggingComponent extends Component<DraggingValue> {
  static entities = new TrackableCollection<Entity<Components>>(
    'DraggingComponent'
  )
  onAttach(entity: Entity<Components>) {
    DraggingComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    DraggingComponent.entities.remove(entity)
  }
  constructor(dragOffset: Vector3, x: number, y: number) {
    super({
      dragOffset,
      dampenedDelta: new Vector3(),
      startPixel: new Vector2(x, y),
      farEnough: (x: number, y: number) => {
        return (
          __tempVec.set(x, y).distanceTo(this.value.startPixel) >
          __minPixelsToMove
        )
      }
    })
  }
}
