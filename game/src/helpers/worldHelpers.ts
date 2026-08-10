import { Entity } from 'gg'
import { ComponentOf } from 'gg/dist/ecs/Component'

import { Components } from '~/components'
import { TrackableCollection } from '~/utils/TrackableCollection'
import { world } from '~/world'

export const worldEntities = new TrackableCollection<Entity<Components>>(
  'worldEntities'
)
export function createWorldEntity(components?: ComponentOf<Components>[]) {
  const ent = world.createEntity(components)
  worldEntities.add(ent)
  return ent
}
export function removeWorldEntity(id: number) {
  const ent = world.getEntity(id)
  if (ent) {
    worldEntities.remove(ent)
    world.removeEntity(id)
  }
}
