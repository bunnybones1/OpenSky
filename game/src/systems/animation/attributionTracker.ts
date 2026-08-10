import { Locatable } from '@opensky/shared/cardCache'
import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { CardLocation } from '@skyweaver/state-metadata'
import { Vector3, Vector4 } from 'three'

import { CardCacheWithEntities } from '~/cardCache'
import {
  makeAttributionBlueLine,
  makeAttributionLine
} from '~/helpers/makeAttributionLine'
import { showCauseAndEffect } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'

import { ActionStack } from '../AnimationOrchestrator'

const __reg: Map<
  string,
  Array<ReturnType<typeof makeAttributionBlueLine>>
> = new Map()

const colorBoost = new Vector4(2, 2, 2, 1)
const colorsByType: {
  [K: string]: Vector4
} = {
  moveToZone: new Vector4(0, 1, 0, 1),
  modifyCard: new Vector4(0, 0.75, 1, 1),
  conjure: new Vector4(1, 0.5, 0, 1),
  trigger: new Vector4(1, 0.85, 0, 1)
} as const
for (const c in colorsByType) {
  colorsByType[c].multiply(colorBoost)
}

const heightEndByType = {
  moveToZone: -0.005,
  modifyCard: -0.015,
  conjure: -0.015,
  trigger: -0.01
}

const NULL_VEC3 = new Vector3()
export async function maybeStartAttributionTracker(
  type: keyof typeof heightEndByType,
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  card: Locatable | CardLocation,
  sloppy = false,
  endOffset = NULL_VEC3
) {
  if (showCauseAndEffect.value) {
    const e = cardCache.getEntity(context.triggerSource?.id)
    const me = cardCache.getEntity(card)
    if (
      e &&
      me &&
      (e !== me || sloppy) &&
      e.has('transform') &&
      me.has('transform')
    ) {
      const key = sloppy
        ? `${type}:${me.get('card')}`
        : `${type}:${e.get('card')}:${me.get('card')}`
      if (!__reg.has(key)) {
        __reg.set(key, [])
      }
      const arr = __reg.get(key)!
      const line = makeAttributionLine(
        e.get('transform')!,
        0,
        -0.005,
        heightEndByType[type],
        me.get('transform')!,
        0 + endOffset.x,
        0.005 + endOffset.y,
        heightEndByType[type] + endOffset.z,
        colorsByType[type]
      )
      if (line) {
        arr.push(line)
        animationDelay(5000).then(() => finishAttributionLine(key, line))
        await line.animInFinished
      }
    }
  }
}

export async function maybeEndAttributionTracker(
  type: string,
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  card: Locatable | CardLocation,
  sloppy = false
) {
  if (showCauseAndEffect.value) {
    const e = cardCache.getEntity(context.triggerSource?.id)
    const me = cardCache.getEntity(card)
    if (
      e &&
      me &&
      (e !== me || sloppy) &&
      e.has('transform') &&
      me.has('transform')
    ) {
      const key = sloppy
        ? `${type}:${me.get('card')}`
        : `${type}:${e.get('card')}:${me.get('card')}`
      await finishAttributionLine(key)
    }
  }
}

async function finishAttributionLine(
  key: string,
  maybeLine?: ReturnType<typeof makeAttributionBlueLine>
) {
  if (__reg.has(key)) {
    const arr = __reg.get(key)!
    let line = maybeLine
    if (line && arr.includes(line)) {
      removeFromArray(arr, line)
    } else if (!line && arr.length > 0) {
      line = arr.pop()
    }
    if (arr.length === 0) {
      __reg.delete(key)
    }
    if (line) {
      await line.animOut()
    }
  }
}

export function clearAllAttributionLines() {
  __reg.forEach(lines => {
    for (const line of lines) {
      if (line) {
        line.animOut()
      }
    }
  })
  __reg.clear()
}
