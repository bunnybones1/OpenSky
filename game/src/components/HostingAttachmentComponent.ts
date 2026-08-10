import { Component, Entity } from 'gg'
import { Quaternion, Vector3 } from 'three'

import { TargetTransform } from '~/systems/animation/transform'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

const __origin = new Vector3()

class HostingAttachmentValue {
  transform: TargetTransform = {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: new Vector3(1, 1, 1)
  }
  constructor(
    public entity: Entity<Components>,
    public offset: Vector3,
    public scale: number,
    public instantMoveMyAttachments: () => void
  ) {
    //
  }
}

export default class HostingAttachmentComponent extends Component<HostingAttachmentValue> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HostingAttachmentComponent'
  )
  constructor(
    entity: Entity<Components>,
    instantMoveMyAttachments: () => void,
    offset = __origin,
    scale = 1
  ) {
    super(
      new HostingAttachmentValue(
        entity,
        offset.clone(),
        scale,
        instantMoveMyAttachments
      )
    )
  }

  onAttach(entity: Entity<Components>) {
    HostingAttachmentComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    HostingAttachmentComponent.entities.remove(entity)
  }
}
