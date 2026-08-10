import { HeroSkin } from '@opensky/shared/constants'

import HeroCardAssemblage, {
  createHeroCardInteractives
} from '~/assemblages/HeroCardAssemblage'
import { createWorldEntity } from '~/helpers/worldHelpers'
import { applyInteractivesOnCard } from '~/utils/helpers/InteractivesHelpers'

export function createHeroCard(heroSkin: HeroSkin) {
  const entity = createWorldEntity(HeroCardAssemblage(heroSkin))

  applyInteractivesOnCard(entity, createHeroCardInteractives(heroSkin))

  return entity
}
