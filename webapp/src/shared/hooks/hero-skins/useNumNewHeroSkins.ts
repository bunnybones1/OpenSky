import { ItemType } from '@opensky/proto'
import { useMemo } from 'react'

import { useTokenBalances } from '~/shared/queries/useTokenBalances'

export const useNumNewHeroSkins = () => {
  const { data: heroSkinBalances } = useTokenBalances(ItemType.SW_HERO_SKINS)
  return useMemo(() => {
    return heroSkinBalances?.filter((heroSkin) => heroSkin.isNew).length || 0
  }, [heroSkinBalances])
}
