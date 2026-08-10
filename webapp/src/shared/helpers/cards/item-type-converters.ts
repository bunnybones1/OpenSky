import { ItemType } from '~/lib/proto'

export const itemTypeToTextKey = (
  type: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
) => {
  if (type === ItemType.SW_GOLD_CARDS) return 'cards.grades.Gold' as const
  if (type === ItemType.SW_SILVER_CARDS) return 'cards.grades.Silver' as const
  return 'cards.grades.Base' as const
}

export const itemTypeToString = (
  type: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
) => {
  if (type === ItemType.SW_GOLD_CARDS) return 'gold' as const
  if (type === ItemType.SW_SILVER_CARDS) return 'silver' as const
  return 'base' as const
}
