import { ItemType } from '~/lib/proto'
import { BalanceItem } from '~/shared/types/market'

export const getHighestOwnedGrade = (balances: BalanceItem[]) => {
  let grade: ItemType | undefined = undefined

  if (
    !!balances.find((b) => b.itemType === ItemType.SW_GOLD_CARDS && b.balance > 0)
  ) {
    grade = ItemType.SW_GOLD_CARDS
  } else if (
    !!balances.find((b) => b.itemType === ItemType.SW_SILVER_CARDS && b.balance > 0)
  ) {
    grade = ItemType.SW_SILVER_CARDS
  } else if (
    !!balances.find((b) => b.itemType === ItemType.SW_BASE_CARDS && b.balance > 0)
  ) {
    grade = ItemType.SW_BASE_CARDS
  }

  return grade
}
