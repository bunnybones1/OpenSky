import { Entity } from 'gg'

import { Components } from '~/components'
import { ZoneType } from '~/components/ZoneComponent'

type E = Entity<Components>
type NE = E | undefined

export function isEntityInZone(e: NE, zone: ZoneType) {
  return !!(e && e.has('zone') && e.get('zone').stateZone === zone)
}

export function getEntityZone(e: NE) {
  return e && e.has('zone') && e.get('zone').stateZone
}

export function areEntitiesInSameZone(entA: NE, entB: NE) {
  if (entA === undefined && entB === undefined) {
    return false
  }
  const zoneA = getEntityZone(entA)
  const zoneB = getEntityZone(entB)
  return zoneA === zoneB
}
