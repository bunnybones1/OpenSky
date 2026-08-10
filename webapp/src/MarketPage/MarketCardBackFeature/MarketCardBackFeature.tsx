import { memo } from 'react'

import { CardBackFeaturePage } from '~/shared/components/CardBackFeaturePage/CardBackFeaturePage'
import { useSelector } from '~/shared/redux/index'

import { marketCardBackFeatureIdSelector } from '../shared/selectors/marketCardBackFeatureIdSelector'
import { EquipControls } from './components/EquipControls'
import { ShopControls } from './components/ShopControls'

export const MarketCardBackFeature = memo(() => {
  const id = useSelector(marketCardBackFeatureIdSelector)
  if (!id) return null

  return (
    <CardBackFeaturePage
      EquipControls={EquipControls}
      id={id}
      ShopControls={ShopControls}
    />
  )
})

MarketCardBackFeature.displayName = 'MarketCardBackFeature'
