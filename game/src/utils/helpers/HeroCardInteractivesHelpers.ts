import { HeroSkin } from '@opensky/shared/constants'
import { Entity } from 'gg'

import { Components } from '~/components'
import CollidableComponent from '~/components/CollidableComponent'
import HighlightMaterialComponent from '~/components/HighlightMaterialComponent'
import MeshComponent from '~/components/MeshComponent'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'

import { Interactives } from './InteractivesHelpers'

type HeroInteractivesFactoryMethod = (heroSkin: HeroSkin) => Interactives

export function updateInteractivesForHeroCard(
  entity: Entity<Components>,
  interactivesCreator: HeroInteractivesFactoryMethod
) {
  clearInteractivesForHeroCard(entity)
  const heroDetails = entity.get('heroCard')
  const interactives = interactivesCreator(heroDetails)
  applyInteractivesOnHeroCard(entity, interactives)

  return interactives
}

function clearInteractivesForHeroCard(entity: Entity<Components>) {
  entity.remove('highlightMaterial')
  if (entity.has('mesh')) {
    entity.remove('mesh')
  }
  entity.remove('collidable')
}

function applyInteractivesOnHeroCard(
  entity: Entity<Components>,
  { highlight, visualsRoot, collider }: Interactives
) {
  if (highlight) {
    entity.add(
      new HighlightMaterialComponent({
        materials: [highlight.material as MagicFireHighlightMeshMaterial],
        mesh: highlight
      })
    )
  }
  entity.add(new MeshComponent(visualsRoot))
  entity.add(new CollidableComponent(visualsRoot, collider))
}
