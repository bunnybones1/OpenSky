import { OwnershipFilter } from '../types/cards'
import { BalanceItem } from '../types/market'

export const getTokensFilteredByOwnership = (
  ids: number[],
  balances: BalanceItem[] | undefined | null,
  ownership: OwnershipFilter
) => {
  if (balances === undefined) return undefined

  if (!balances) return []

  const ownedIds = balances.map((item) => item.tokenID)

  return ids.filter((id) => {
    switch (ownership) {
      case OwnershipFilter.LOCKED: {
        return !ownedIds.includes(id)
      }
      case OwnershipFilter.OWNED: {
        return ownedIds.includes(id)
      }
      default:
        return true
    }
  })
}
