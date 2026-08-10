import { ItemType } from '@opensky/proto'
import { memo } from 'react'

import { ItemEquipBadge } from '~/shared/components/ItemEquipBadge'
import { useEquippedItem } from '~/shared/queries/useEquippedItems'

interface ItemsCardBackEquipBadgeProps {
  id: number
}

export const ItemsCardBackEquipBadge = memo(
  ({ id }: ItemsCardBackEquipBadgeProps) => {
    const { data: equippedItem } = useEquippedItem(id, ItemType.SW_CARD_BACKS)

    if (!equippedItem) return null

    return <ItemEquipBadge />
  }
)

ItemsCardBackEquipBadge.displayName = 'ItemsCardBackEquipBadge'
