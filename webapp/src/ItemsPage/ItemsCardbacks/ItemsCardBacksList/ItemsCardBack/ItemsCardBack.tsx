import { ItemType } from '@opensky/proto'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'

import { CardBack } from '~/shared/components/CardBack/CardBack'
import { CardBackBalanceAndPriceInfo } from '~/shared/components/CardBackBalanceAndPriceInfo'
import { BalanceOrPrice } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { ItemNewBadge } from '~/shared/components/ItemNewBadge'
import { AllCardBacks } from '~/shared/constants/card-backs'
import { getTokenBalancesKey } from '~/shared/constants/react-query-keys'
import { makeItemsCardBacksFeatureRoute } from '~/shared/helpers/routes/items-page'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useDispatch } from '~/shared/redux/index'
import { authenticationState } from '~/shared/state/authentication-state'
import { BalanceItem } from '~/shared/types/market'

import { ItemsCardBackEquipBadge } from './components/ItemsCardBackEquipBadge'
import { useMarkCardBackNotNew } from './useMarkCardBackNotNew'

export interface ItemsCardBackProps {
  id: number
}

const ItemsCardBackNewTag = memo(({ id }: ItemsCardBackProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_CARD_BACKS, id)
  const markCardBackNotNew = useMarkCardBackNotNew()
  const queryClient = useQueryClient()

  const onHide = useCallback(() => {
    // We grab the data from the queryClient rather than using the above "balance"
    // value because its possible for onHide to be called twice in short succession.
    // The first time will change isNew, but the second time wont have that updated
    // value if it depends on "balance" because of the way hooks work so it will
    // try and mark it not new twice
    const isNew = !!queryClient
      .getQueryData<BalanceItem[] | null | undefined>(
        getTokenBalancesKey(ItemType.SW_CARD_BACKS, authenticationState.userAddress)
      )
      ?.find((_balance) => _balance.tokenID === id)?.isNew

    if (isNew) {
      markCardBackNotNew.mutate([id])
    }
  }, [id, markCardBackNotNew, queryClient])

  if (!balance) return null

  return <ItemNewBadge isNew={!!balance.isNew} onHide={onHide} />
})

ItemsCardBackNewTag.displayName = 'ItemsCardBackNewTag'

const ItemsCardBackBalance = memo(({ id }: ItemsCardBackProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_CARD_BACKS, id)

  const balances = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (balance === undefined) return undefined
    return [
      {
        amount: !!balance ? balance.balance : 0,
        icon: { type: 'card-back-solid' },
        id: 'CARDBACK'
      }
    ]
  }, [balance])

  const cardBack = useMemo(() => AllCardBacks.get(id), [id])

  return (
    <CardBackBalanceAndPriceInfo
      balances={balances}
      id={id}
      name={cardBack?.name}
      areBalancesLoading={balances === undefined}
    />
  )
})

ItemsCardBackBalance.displayName = 'ItemsCardBackBalance'

export const ItemsCardBack = memo(({ id }: ItemsCardBackProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_CARD_BACKS, id)

  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    return dispatch(push(makeItemsCardBacksFeatureRoute(id)))
  }, [dispatch, id])

  const markCardBackNotNew = useMarkCardBackNotNew()

  const onHover = useCallback(() => {
    markCardBackNotNew.mutate([id])
  }, [id, markCardBackNotNew])

  return (
    <CardBack
      id={id}
      onClick={onClick}
      onHover={!!balance?.isNew ? onHover : undefined}
      isLocked={!balance || balance.balance === 0}
      isTiltable
      BalanceAndPriceInfo={ItemsCardBackBalance}
      NewBadge={ItemsCardBackNewTag}
      EquipBadge={ItemsCardBackEquipBadge}
    />
  )
})

ItemsCardBack.displayName = 'ItemsCardBack'
