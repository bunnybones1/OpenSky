import { Entity } from 'gg'
import { Quaternion, Vector3 } from 'three'

import { AnimatedObject } from '~/systems/animation/RawTweener'
import { TargetTransform } from '~/systems/animation/transform'

import { Components } from '.'

let __id = 0
export class Seat implements TargetTransform {
  position = new Vector3()
  quaternion = new Quaternion()
  scale = new Vector3(1, 1, 1)
  needsToMove = true
  isNew = true
  animation?: AnimatedObject<any>
  id = __id++
  constructor(
    public entity: Entity<Components>,
    public name: string
  ) {}
}
