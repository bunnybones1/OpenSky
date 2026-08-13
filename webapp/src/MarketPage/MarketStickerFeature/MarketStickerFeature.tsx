import { memo } from 'react'

import { EquipControls as InventoryEquipControls } from '~/ItemsPage/ItemsStickerFeature/components/EquipControls'
import { StickerFeaturePage } from '~/shared/components/StickerFeaturePage/StickerFeaturePage'
import { useSelector } from '~/shared/redux/index'

import { marketStickerFeatureIdSelector } from '../shared/selectors/marketStickerFeatureIdSelector'
import { EquipControls } from './components/EquipControls'
import { ShopControls } from './components/ShopControls'

interface MarketStickerFeatureProps {
  inventoryOnly?: boolean
}

export const MarketStickerFeature = memo(
  ({ inventoryOnly }: MarketStickerFeatureProps) => {
    const id = useSelector(marketStickerFeatureIdSelector)

    if (!id) return null

    return (
      <StickerFeaturePage
        EquipControls={inventoryOnly ? InventoryEquipControls : EquipControls}
        id={id}
        ShopControls={inventoryOnly ? undefined : ShopControls}
        showLockIfLocked={inventoryOnly}
      />
    )
  }
)

MarketStickerFeature.displayName = 'MarketStickerFeature'
