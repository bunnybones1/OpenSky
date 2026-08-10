import { memo } from 'react'

import { StickerFeaturePage } from '~/shared/components/StickerFeaturePage/StickerFeaturePage'
import { useSelector } from '~/shared/redux/index'

import { marketStickerFeatureIdSelector } from '../shared/selectors/marketStickerFeatureIdSelector'
import { EquipControls } from './components/EquipControls'
import { ShopControls } from './components/ShopControls'

export const MarketStickerFeature = memo(() => {
  const id = useSelector(marketStickerFeatureIdSelector)

  if (!id) return null

  return (
    <StickerFeaturePage
      EquipControls={EquipControls}
      id={id}
      ShopControls={ShopControls}
    />
  )
})

MarketStickerFeature.displayName = 'MarketStickerFeature'
