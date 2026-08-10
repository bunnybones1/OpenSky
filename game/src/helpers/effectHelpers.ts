import { Entity } from 'gg'
import { Scene } from 'three'

import { Components } from '~/components'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'

import { ownedZoneCollections } from './zoneCollections'

export async function shineBannerFrom(ent: Entity<Components>, scene: Scene) {
  if (ent.has('isAnimating')) {
    await ent.get('isAnimating').finishedFull
  }
  const heroEnt = getHero(ent.has('player'))
  if (heroEnt && ent.has('transform')) {
    getBeamLauncher('bannerCallOut', scene).launch(
      ent.get('transform').position,
      heroEnt.get('transform').position
    )
  }
}

export function getHero(isPlayer: boolean): Entity<Components> | undefined {
  const field =
    ownedZoneCollections[`${isPlayer ? 'Player' : 'Opponent'}_Field` as const]
      .items
  return field.find(
    e =>
      e.has('cardInstance') && e.get('cardInstance').state.view.type === 'hero'
  )
}

export function getHeroAbility(
  isPlayer: boolean
): Entity<Components> | undefined {
  const field =
    ownedZoneCollections[
      `${isPlayer ? 'Player' : 'Opponent'}_HeroAbility` as const
    ].items
  return field.find(e => e.has('heroAbility'))
}
