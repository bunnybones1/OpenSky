import { memo } from 'react'

import { CardBackFeaturePage } from '~/shared/components/CardBackFeaturePage/CardBackFeaturePage'
import { useSelector } from '~/shared/redux/index'

import { itemsCardBackFeatureIdSelector } from '../shared/selectors/itemsCardBackFeatureIdSelector'
import { EquipControls } from './components/EquipControls'

export const ItemsCardBackFeature = memo(() => {
  const id = useSelector(itemsCardBackFeatureIdSelector)

  if (!id) return null

  return (
    <CardBackFeaturePage showLockIfLocked EquipControls={EquipControls} id={id} />
  )
})

ItemsCardBackFeature.displayName = 'ItemsCardBackFeature'
