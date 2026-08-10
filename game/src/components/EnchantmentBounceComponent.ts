import { BaseCard } from '@skyweaver/state-metadata'
import { Component, Entity } from 'gg'

import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { animationDelay } from '~/utils/asyncUtils'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

interface EnchantmentBounceValue {
  enchantNames: BaseCard[]
}

export default class EnchantmentBounceComponent extends Component<EnchantmentBounceValue> {
  static entities = new TrackableCollection<Entity<Components>>(
    'EnchantmentBounceComponent'
  )
  constructor(enchantNames: BaseCard[]) {
    super({ enchantNames })
  }

  onAttach(entity: Entity<Components>) {
    EnchantmentBounceComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    EnchantmentBounceComponent.entities.remove(entity)
    for (const ench of this.value.enchantNames) {
      bounceAttachmentOnEntity(entity, ench)
    }
  }
}

const __bouncingEntities = new Set<Entity<Components>>()
let __bounceCleanupInitd = false

function __initBounceCleanup() {
  if (__bounceCleanupInitd) {
    return
  }
  __bounceCleanupInitd = true
  EnchantmentBounceComponent.entities.listenForRemove(e => {
    __bouncingEntities.delete(e)
  })
}

export async function bounceAttachmentOnEntity(
  entity: Entity<Components>,
  onlyIfAttachIs?: BaseCard
) {
  __initBounceCleanup()
  const host =
    entity.has('hostingAttachment') && entity.get('hostingAttachment')
  if (!host) {
    return
  }

  const bouncingEntity = host.entity
  const transform =
    bouncingEntity.has('transform') && bouncingEntity.get('transform')
  if (!transform) {
    return
  }
  if (
    (onlyIfAttachIs !== undefined && !bouncingEntity.has('cardInstance')) ||
    onlyIfAttachIs !== bouncingEntity.get('cardInstance').base
  ) {
    return
  }

  if (__bouncingEntities.has(bouncingEntity)) {
    return
  }
  __bouncingEntities.add(bouncingEntity)

  const initScale = 0.4
  const finalScale = host.scale * 1.25
  await simpleTweener.to({
    description: 'enchantment bounce',
    target: host,
    propertyGoals: {
      scale: finalScale
    },
    duration: 150,
    easing: Easing.Quadratic.Out
  }).finished

  await simpleTweener.to({
    description: 'enchantment bounce',
    target: host,
    propertyGoals: {
      scale: initScale
    },
    duration: 500,
    easing: Easing.Elastic.Out
  })

  await animationDelay(1400)

  __bouncingEntities.delete(bouncingEntity)
}
