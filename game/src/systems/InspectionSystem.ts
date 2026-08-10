import { System } from 'gg'

import { Components } from '~/components'
import InspectableComponent from '~/components/InspectableComponent'
import { inspectableZoneEntities } from '~/helpers/compoundCollections'

export default class InspectionSystem extends System<Components> {
  init() {
    inspectableZoneEntities.listenForAdd(entity =>
      entity.add(new InspectableComponent())
    )
    inspectableZoneEntities.listenForRemove(entity =>
      entity.remove('inspectable')
    )
  }
  update() {
    //nothing
  }
}
