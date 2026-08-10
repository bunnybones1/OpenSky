import { ItemType } from '@opensky/proto'
import {
  getBaseID,
  getGoldID,
  getSilverID,
  getUngradedID
} from '@opensky/shared/assetsIDs'
import { useMemo } from 'react'

import { isNotNull } from '~/shared/helpers/is-defined-is-not-null'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'

export const useBalancesForCard = (id: number) => {
  const { data: silverBalance } = useTokenBalance(
    ItemType.SW_SILVER_CARDS,
    getSilverID(getUngradedID(id))
  )
  const { data: goldBalance } = useTokenBalance(
    ItemType.SW_GOLD_CARDS,
    getGoldID(getUngradedID(id))
  )
  const { data: baseBalance } = useTokenBalance(
    ItemType.SW_BASE_CARDS,
    getBaseID(getUngradedID(id))
  )

  return useMemo(() => {
    if (
      baseBalance === undefined ||
      silverBalance === undefined ||
      goldBalance === undefined
    )
      return

    return [baseBalance, silverBalance, goldBalance].filter(isNotNull)
  }, [baseBalance, goldBalance, silverBalance])
}
