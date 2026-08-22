import { memo } from 'react'

import { EquipControls as InventoryEquipControls } from '~/ItemsPage/ItemsCardBackFeature/components/EquipControls'
import { CardBackFeaturePage } from '~/shared/components/CardBackFeaturePage/CardBackFeaturePage'
import { useSelector } from '~/shared/redux/index'

import { marketCardBackFeatureIdSelector } from '../shared/selectors/marketCardBackFeatureIdSelector'
import { EquipControls } from './components/EquipControls'
import { ShopControls } from './components/ShopControls'

interface MarketCardBackFeatureProps {
  inventoryOnly?: boolean
}

export const MarketCardBackFeature = memo(
  ({ inventoryOnly }: MarketCardBackFeatureProps) => {
    const id = useSelector(marketCardBackFeatureIdSelector)
    if (!id) return null

    return (
      <CardBackFeaturePage
        EquipControls={inventoryOnly ? InventoryEquipControls : EquipControls}
        id={id}
        ShopControls={inventoryOnly ? undefined : ShopControls}
        showLockIfLocked={inventoryOnly}
      />
    )
  }
)

MarketCardBackFeature.displayName = 'MarketCardBackFeature'
