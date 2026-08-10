import { Entity } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import { animationDelay } from '~/utils/asyncUtils'

export function sortEntitiesByOrder(
  a: Entity<Components>,
  b: Entity<Components>
) {
  return a.get('order') - b.get('order')
}
export function sortEntitiesByReverseOrder(
  a: Entity<Components>,
  b: Entity<Components>
) {
  return b.get('order') - a.get('order')
}

const __justInFront = new Vector3(0, 0.01, 0)
export function justInFrontOfElement(
  entity: Entity<Components>,
  distance = 0.01
) {
  const jif = __justInFront.clone()
  jif.y = distance
  if (entity.has('transform')) {
    const t = entity.get('transform')
    jif.applyQuaternion(t.quaternion)
    jif.add(t.position)
  }
  return jif
}

export function setFrontFacingVisibility(
  entity: Entity<Components>,
  shouldBeVisible: boolean
) {
  const isVisible = entity.has('frontFacesVisible')
  if (isVisible && !shouldBeVisible) {
    entity.remove('frontFacesVisible')
  } else if (!isVisible && shouldBeVisible) {
    entity.add(new FrontFacesVisibleComponent())
  }
}

function setFrontFacingVisibilityInFuture(
  entity: Entity<Components>,
  visible: boolean,
  delay: number,
  delayedFilter: (ent: Entity<Components>) => boolean
) {
  animationDelay(delay).then(() => {
    if (delayedFilter(entity)) {
      setFrontFacingVisibility(entity, visible)
    }
  })
}

export function autoManageFrontFacingVisibility(
  entity: Entity<Components>,
  visible: boolean,
  hideDelay: number,
  delayedFilter: (ent: Entity<Components>) => boolean
) {
  if (visible) {
    setFrontFacingVisibility(entity, true)
  } else {
    setFrontFacingVisibilityInFuture(entity, false, hideDelay, delayedFilter)
  }
}

export function autoManageCardBackFullness(
  entity: Entity<Components>,
  isFull: boolean,
  isFlat: boolean,
  hideDelay: number,
  delayedFilter: (ent: Entity<Components>) => boolean
) {
  if (isFull) {
    setCardBackFullness(entity, true)
  } else {
    setCardBackFullnessInFuture(entity, false, hideDelay, delayedFilter)
  }

  if (!isFlat) {
    setCardBackFlatness(entity, false)
  } else {
    setCardBackFlatnessInFuture(entity, true, hideDelay, delayedFilter)
  }
}

function setCardBackFullnessInFuture(
  entity: Entity<Components>,
  visible: boolean,
  delay: number,
  delayedFilter: (ent: Entity<Components>) => boolean
) {
  animationDelay(delay).then(() => {
    if (delayedFilter(entity)) {
      setCardBackFullness(entity, visible)
    }
  })
}

function setCardBackFullness(entity: Entity<Components>, visible: boolean) {
  if (entity.has('cardBackVisuals')) {
    const cardBackVisuals = entity.get('cardBackVisuals')

    cardBackVisuals.fullness = visible
  }
}

function setCardBackFlatnessInFuture(
  entity: Entity<Components>,
  visible: boolean,
  delay: number,
  delayedFilter: (ent: Entity<Components>) => boolean
) {
  animationDelay(delay).then(() => {
    if (delayedFilter(entity)) {
      setCardBackFlatness(entity, visible)
    }
  })
}

function setCardBackFlatness(entity: Entity<Components>, visible: boolean) {
  if (entity.has('cardBackVisuals')) {
    const cardBackVisuals = entity.get('cardBackVisuals')

    cardBackVisuals.flatness = visible
  }
}
