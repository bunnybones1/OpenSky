import { getHeroAbilityAccentColorData } from '@opensky/shared/heroAbilityAccentColorsLib'
import { BaseCard } from '@skyweaver/state-metadata'
import { Color, Vector4 } from 'three'

export function getHeroAbilityAccentColor(base: BaseCard) {
  const d = getHeroAbilityAccentColorData(base)
  const c = new Color(d[0])
  return new Vector4(c.r, c.g, c.b, d[1])
}

export function getHeroAbilityAccentColorPrealphad(
  base: BaseCard,
  alpha = 0.2
) {
  const c = new Color()
  const v = getHeroAbilityAccentColor(base)
  c.r = v.x * alpha
  c.g = v.y * alpha
  c.b = v.z * alpha
  return c
}
