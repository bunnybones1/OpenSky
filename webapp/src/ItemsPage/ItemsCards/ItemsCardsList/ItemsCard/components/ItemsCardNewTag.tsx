import { getItemType } from '@opensky/shared/assetsIDs'
import { memo, useCallback, useMemo } from 'react'

import { ItemNewBadge } from '~/shared/components/ItemNewBadge'
import { Cards } from '~/shared/constants/cards'
import { useMarkCardsNotNew } from '~/shared/mutations/useMarkCardsNotNew'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'

interface ItemsCardNewTagProps {
  id: number
}

export const ItemsCardNewTag = memo(({ id }: ItemsCardNewTagProps) => {
  const { data: balance } = useTokenBalance(getItemType(id), id)

  const grade = useMemo(() => Cards.get(id)?.grade, [id])

  const markTokenNotNew = useMarkCardsNotNew()

  const onHide = useCallback(() => {
    markTokenNotNew.mutate([id])
  }, [id, markTokenNotNew])

  if (!grade || !balance) return null

  return <ItemNewBadge isNew={!!balance.isNew} onHide={onHide} />
})

ItemsCardNewTag.displayName = 'ItemsCardNewTag'
