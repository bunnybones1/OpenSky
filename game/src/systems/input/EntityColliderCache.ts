import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { Entity } from 'gg'
import { Object3D } from 'three'

import { Components } from '~/components'

export class EntityColliderCache<T extends Entity<Components>> {
  cleanUpEntityCollider(entity: T) {
    if (this.collidersByEntities.has(entity)) {
      this.remove(entity)
      const newCollider = entity.get('collidable')
      this.add(entity, newCollider)
    }
  }
  readonly entitiesByColliders = new Map<Object3D, T>()
  readonly collidersByEntities = new Map<T, Object3D>()
  readonly colliders: Object3D[] = []
  add(entity: T, collider: Object3D) {
    this.entitiesByColliders.set(collider, entity)
    this.collidersByEntities.set(entity, collider)
    this.colliders.push(collider)
  }
  remove(entity: T) {
    const collider = this.collidersByEntities.get(entity)
    if (collider) {
      removeFromArray(this.colliders, collider)
      this.collidersByEntities.delete(entity)
      this.entitiesByColliders.delete(collider)
    } else {
      throw new Error('Entity not registered here.')
    }
  }
  resolveCollider(collider: Object3D) {
    if (!this.entitiesByColliders.has(collider)) {
      throw new Error('Collider not registered here.')
    }
    return this.entitiesByColliders.get(collider)!
  }
  get count() {
    return this.colliders.length
  }
}
