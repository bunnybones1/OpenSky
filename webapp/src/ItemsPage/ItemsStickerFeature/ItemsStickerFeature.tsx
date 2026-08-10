import { memo } from 'react'

import { StickerFeaturePage } from '~/shared/components/StickerFeaturePage/StickerFeaturePage'
import { useSelector } from '~/shared/redux/index'

import { itemsStickerFeatureIdSelector } from '../shared/selectors/itemsStickerFeatureIdSelector'
import { EquipControls } from './components/EquipControls'

export const ItemsStickerFeature = memo(() => {
  const id = useSelector(itemsStickerFeatureIdSelector)

  if (!id) return null

  return <StickerFeaturePage EquipControls={EquipControls} id={id} showLockIfLocked />
})

ItemsStickerFeature.displayName = 'ItemsStickerFeature'
