import { EntityManager, System } from 'gg'

import { ScreenSpaceArchetype } from '~/archetypes'
import { Components } from '~/components'

export default class ScreenSpaceSystem extends System<Components> {
  init() {
    //nothing
  }

  update(manager: EntityManager<Components>, dt: number) {
    const { entities } = manager.getArchetype(ScreenSpaceArchetype)
    entities.forEach(entity => {
      const ssd = entity.get('screenSpace')
      const transform = entity.get('transform')
      ssd.update(transform, dt)
    })
  }
}
