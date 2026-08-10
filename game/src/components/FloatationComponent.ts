import { Component, Entity } from 'gg'
import { Vector3 } from 'three'

import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export class FloatationState {
  decoupleMatrixHackFromTransform?: () => void
  strength = 0.001
  constructor(
    public vec: Vector3,
    public speed = 1,
    public offset = 0
  ) {
    //
  }
}

export default class FloatationComponent extends Component<FloatationState> {
  constructor(vec: Vector3, speed: number = 1, offset: number = 0) {
    super(new FloatationState(vec, speed, offset))
  }
  static entities = new TrackableCollection<Entity<Components>>(
    'FloatationComponent'
  )

  onAttach(entity: Entity<Components>) {
    FloatationComponent.entities.add(entity)
    this.startFloating()
  }
  startFloating() {
    simpleTweener.to({
      description: 'start floating',
      target: this.value,
      propertyGoals: { strength: 1 },
      easing: Easing.Quartic.InOut,
      duration: 500
    })
  }

  onDetach(entity: Entity<Components>) {
    this.stopFloating()
    FloatationComponent.entities.remove(entity)
  }
  stopFloating() {
    simpleTweener.to({
      description: 'stop floating',
      target: this.value,
      propertyGoals: { strength: 0 },
      easing: Easing.Quintic.In,
      duration: 500
    })
  }
}
