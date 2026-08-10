import { DeckClass } from '@opensky/proto'
import {
  AssetPriority,
  MeshAnimationAssetNameStrings
} from '@opensky/shared/assets'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'

import { getAssetsManager } from '~/assets'

export function changeAssetPriorityOfHeroAbilityMSAsAndLoadThem(
  prismsAboutToBattle: DeckClass[]
) {
  const herosAboutToBattle = [...new Set(prismsAboutToBattle)].map(
    p => DECKCLASS_HEROES[p]
  ) as string[]
  const heroEnumStrings = Object.values(DECKCLASS_HEROES) as string[]
  for (const assetName of MeshAnimationAssetNameStrings) {
    const maybeHero = assetName.split('_')[0].toUpperCase()
    if (
      heroEnumStrings.includes(maybeHero) &&
      herosAboutToBattle.includes(maybeHero)
    ) {
      getAssetsManager().changePriority(assetName, AssetPriority.Game)
    }
  }
  getAssetsManager().loadPriority(AssetPriority.Game)
}
