import { getIntRange, makeLerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import { getAssetsManager } from '~/assets/index'
import { PALETTE_ROW } from '~/constants'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import Object2D from '~/meshes/Object2D'
import {
  Easing,
  makeRelativeTimelineRemap,
  nestEases
} from '~/systems/animation/Easing'
const REWARDS_PALLET = [
  PALETTE_ROW.CARD_SILVER,
  PALETTE_ROW.CARD_SILVER,
  PALETTE_ROW.CARD_GOLD
]
export function getRewardIconPrefab(initRatio = 0) {
  const pivot = new Object2D()
  const anim = { value: initRatio }
  const timelines = getIntRange(3).map(i =>
    nestEases([makeRelativeTimelineRemap(i, 1, 2 - i), Easing.Quartic.InOut])
  )
  const xSep = 6
  const ySep = 0
  const angle = 0.25
  const animatedProps = [
    {
      opacity: timelines[0],
      x: nestEases([timelines[1], makeLerp(0, -xSep)]),
      y: nestEases([timelines[1], makeLerp(0, -ySep)]),
      angle: nestEases([timelines[1], makeLerp(0, -angle)])
    },
    {
      opacity: timelines[1],
      x: nestEases([timelines[1], makeLerp(0, xSep)]),
      y: nestEases([timelines[1], makeLerp(0, ySep)]),
      angle: nestEases([timelines[1], makeLerp(0, angle)])
    },
    {
      opacity: timelines[2],
      x: () => xSep,
      y: () => ySep,
      angle: () => angle
    }
  ]
  const opacityControllers: Array<{ value: number }> = []
  const icons = getIntRange(3).map(i => {
    const { icon, opacityController } = getIcon(i)
    opacityControllers.push(opacityController)
    pivot.add(icon)
    icon.matrix.setConstraints(undefined, ReadonlyPin.Center.clone())
    return icon
  })
  listenToProperty(anim, 'value', v => {
    for (let i = 0; i < icons.length; i++) {
      const animatedProp = animatedProps[i]
      const opacity = animatedProp.opacity(v)
      opacityControllers[i].value = opacity
      if (opacity > 0) {
        const icon = icons[i]
        icon.matrix.opacity = animatedProp.opacity(v)
        icon.matrix.anchor.x.offset = animatedProp.x(v)
        icon.matrix.anchor.y.offset = animatedProp.y(v)
        icon.material.angle = animatedProp.angle(v)
      }
    }
  })
  return { pivot, anim }
}

function getIcon(i: number) {
  const icon = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'icon-card',
    true
  )
  const glow = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'icon-card-glow',
    true,
    true
  )
  const glowMaterial = glow.material
  glowMaterial.visible = false
  icon.add(glow)
  const opacityController = { value: 0 }
  if (icon.material instanceof PaletteMappedVertexColorMeshMaterial) {
    const iconMaterial = icon.material
    icon.material.userData.originalOpacity = 1
    iconMaterial.paletteRow = REWARDS_PALLET[i]
    listenToProperty(opacityController, 'value', v => {
      iconMaterial.opacity = v
      iconMaterial.visible = v > 0
      glow.matrix.opacity = Math.sin(v * Math.PI)
      glowMaterial.visible = v > 0 && v < 1
      glowMaterial.angle = iconMaterial.angle
    })
  }
  return { icon, opacityController }
}
