import { lerp } from '@opensky/shared/utils/math'
import { EffectType } from '@skyweaver/state-metadata'
import { Object3D, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { toggleTriggerIndicators } from '~/tempDesignOptions'

import { UnlockedRarity } from './typeHelpers'

const __triggerIcons: { [K in EffectType | 'Attack']: string | undefined } = {
  Death: 'trigger-icon-death',
  Glory: 'trigger-icon-glory',
  Inspire: 'trigger-icon-inspire',
  Play: undefined,
  Summon: undefined,
  Internal: undefined,
  Continuous: 'trigger-icon-aura',
  Generic: 'trigger-icon-generic',
  Sunrise: 'trigger-icon-sunrise',
  Sunset: 'trigger-icon-sunset',
  Attack: 'trigger-icon-attack',
  Slay: 'trigger-icon-slay',
  Choose: 'trigger-icon-slay'
}

const __cachedTriggerIcons = new Map<string, Object3D>()
function __getTriggerIcon(et: EffectType | 'Attack') {
  const objName = __triggerIcons[et]
  if (objName) {
    if (!__cachedTriggerIcons.has(objName)) {
      __cachedTriggerIcons.set(
        objName,
        getAssetsManager().fetchMeshDeepClone(
          'gamePiecesGraphical',
          objName,
          undefined,
          true
        )
      )
    }
    return __cachedTriggerIcons.get(objName)!.clone()
  }
  return undefined
}

function __getTriggerIcon2D(et: EffectType | 'Attack') {
  const objName = __triggerIcons[et]
  if (objName) {
    return getAssetsManager().fetchMeshDeepClone('uiSmall', objName)
  }
  return undefined
}

export function makeTriggerHolder(
  effectTypes: Array<EffectType | 'Attack'>,
  rarity: UnlockedRarity
) {
  if (!toggleTriggerIndicators.value) {
    return undefined
  }
  const icons: Object3D[] = effectTypes
    .map(et => __getTriggerIcon(et))
    .filter(a => a !== undefined) as Object3D[]
  const m = 0.01
  if (icons.length > 0) {
    const holderId = Math.min(2, icons.length)
    const triggerHolder = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesPhysical',
      `trigger-icons-${holderId}-frame-${rarity}`,
      undefined,
      true
    )
    const t = icons.length
    for (let i = 0; i < t; i++) {
      const icon = icons[i]
      icon.position.set(lerp(-m, m, (i + 0.5) / t), 0.0005, 0)
      icon.rotation.x = 0
      icon.scale.multiplyScalar(0.45)
      triggerHolder.add(icon)
    }
    return triggerHolder
  }
  return undefined
}
export function makeTriggerHolder2D(effectTypes: EffectType | 'Attack') {
  const icon = __getTriggerIcon2D(effectTypes)
  if (icon) {
    const triggerHolder = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `trigger-holder`
    )
    icon.matrix.prescale = new Vector2(0.6, 0.6)

    triggerHolder.add(icon)
    return triggerHolder
  }
  return undefined
}
