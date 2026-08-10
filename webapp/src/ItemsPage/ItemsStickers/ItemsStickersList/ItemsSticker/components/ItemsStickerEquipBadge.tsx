import { ItemType } from '@opensky/proto'
import { memo } from 'react'

import { ItemEquipBadge } from '~/shared/components/ItemEquipBadge'
import { useEquippedItem } from '~/shared/queries/useEquippedItems'

interface ItemsCardBackEquipBadgeProps {
  id: number
}

export const ItemsStickerEquipBadge = memo(({ id }: ItemsCardBackEquipBadgeProps) => {
  const { data: equippedItem } = useEquippedItem(id, ItemType.SW_STICKERS)

  if (!equippedItem) return null

  return <ItemEquipBadge />
})

ItemsStickerEquipBadge.displayName = 'ItemsStickerEquipBadge'
