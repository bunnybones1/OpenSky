import { ItemType } from '@opensky/proto'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'

import { BalanceOrPrice } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { ItemNewBadge } from '~/shared/components/ItemNewBadge'
import { Sticker } from '~/shared/components/Sticker/Sticker'
import { StickerBalanceAndPriceInfo } from '~/shared/components/StickerBalanceAndPriceInfo'
import { getTokenBalancesKey } from '~/shared/constants/react-query-keys'
import { AllStickers } from '~/shared/constants/stickers'
import { makeItemsStickerFeatureRoute } from '~/shared/helpers/routes/items-page'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useDispatch } from '~/shared/redux/index'
import { authenticationState } from '~/shared/state/authentication-state'
import { BalanceItem } from '~/shared/types/market'

import { ItemsStickerEquipBadge } from './components/ItemsStickerEquipBadge'
import { useMarkStickersNotNew } from './useMarkStickersNotNew'

export interface ItemsStickerProps {
  id: number
}

const ItemsStickerNewTag = memo(({ id }: ItemsStickerProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_STICKERS, id)
  const markStickersNotNew = useMarkStickersNotNew()
  const queryClient = useQueryClient()
  const onHide = useCallback(() => {
    // We grab the data from the queryClient rather than using the above "balance"
    // value because its possible for onHide to be called twice in short succession.
    // The first time will change isNew, but the second time wont have that updated
    // value if it depends on "balance" because of the way hooks work so it will
    // try and mark it not new twice
    const isNew = !!queryClient
      .getQueryData<BalanceItem[] | null | undefined>(
        getTokenBalancesKey(ItemType.SW_STICKERS, authenticationState.userAddress)
      )
      ?.find((_balance) => _balance.tokenID === id)?.isNew

    if (isNew) {
      markStickersNotNew.mutate([id])
    }
  }, [queryClient, id, markStickersNotNew])

  if (!balance) return null

  return <ItemNewBadge isNew={!!balance.isNew} onHide={onHide} />
})

ItemsStickerNewTag.displayName = 'ItemsStickerNewTag'

const ItemsStickerBalance = memo(({ id }: ItemsStickerProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_STICKERS, id)

  const balances = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (balance === undefined) return undefined
    return [
      {
        amount: !!balance ? balance.balance : 0,
        icon: { type: 'stickers-solid' },
        id: 'STICKER'
      }
    ]
  }, [balance])

  const sticker = useMemo(() => AllStickers.get(id), [id])

  return (
    <StickerBalanceAndPriceInfo
      balances={balances}
      id={id}
      name={sticker?.name}
      areBalancesLoading={balances === undefined}
    />
  )
})

ItemsStickerBalance.displayName = 'ItemsStickerBalance'

export const ItemsSticker = memo(({ id }: ItemsStickerProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_STICKERS, id)
  const markStickersNotNew = useMarkStickersNotNew()
  const dispatch = useDispatch()

  const onHover = useCallback(() => {
    markStickersNotNew.mutate([id])
  }, [id, markStickersNotNew])

  const onClick = useCallback(() => {
    dispatch(push(makeItemsStickerFeatureRoute(id)))
  }, [dispatch, id])

  return (
    <Sticker
      id={id}
      onClick={onClick}
      onHover={!!balance?.isNew ? onHover : undefined}
      isLocked={!balance || balance.balance === 0}
      isTiltable
      NewBadge={ItemsStickerNewTag}
      BalanceAndPriceInfo={ItemsStickerBalance}
      EquipBadge={ItemsStickerEquipBadge}
    />
  )
})

ItemsSticker.displayName = 'ItemsSticker'
