/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { EmptyItemsList } from '~/shared/components/EmptyItemsList/EmptyItemsList'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { itemTypeToTextKey } from '~/shared/helpers/cards/item-type-converters'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { marketCardsState } from '~/shared/state/market-cards/market-cards-state'

import { GoldSubText, PurpleSubText, SilverSubText } from './MarketCardsEmptyList.css'

type EmptyListType = 'noGolds' | 'noSilver'

export const MarketCardsEmptyList = memo(() => {
  const { grade } = useSnapshot(marketCardsFilterState)
  const { numSearchResults } = useSnapshot(marketCardsState)
  const { data: account } = useAuthedAccount()
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const dispatch = useDispatch()
  const emptyListType = useMemo<EmptyListType | undefined>(() => {
    if (!grade || !account) return undefined
    if (grade === ItemType.SW_GOLD_CARDS) return 'noGolds'
    if (grade === ItemType.SW_SILVER_CARDS) return 'noSilver'
    return undefined
  }, [grade, account])

  const buttonInfo = useMemo(() => {
    if (!emptyListType) return undefined

    if (emptyListType === 'noSilver') {
      return {
        text: `${t('generic.Play')} ${t('generic.Ranked')}`,
        onClick: () =>
          dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath))
      }
    }

    return {
      text: `${t('generic.Play')} ${t('generic.Conquest')}`,
      onClick: () =>
        dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath))
    }
  }, [dispatch, emptyListType, t])

  const src = useMemo(() => {
    if (!getAssetUrl || !emptyListType) return
    if (emptyListType === 'noGolds')
      return getAssetUrl('webapp/backgrounds/empty-list-gold.webp')
    if (emptyListType === 'noSilver')
      return getAssetUrl('webapp/backgrounds/empty-list-silver.webp')
    return
  }, [emptyListType, getAssetUrl])

  const subText = useMemo(() => {
    if (!!emptyListType) {
      const gradeTouse =
        emptyListType === 'noGolds'
          ? ItemType.SW_GOLD_CARDS
          : ItemType.SW_SILVER_CARDS

      const spanClass = emptyListType === 'noGolds' ? GoldSubText : SilverSubText

      return t('search.emptySearchSub', {
        action: `<span class="${PurpleSubText}">${t(
          `search.itemsCardsActions.${emptyListType}`
        )}</span>`,
        item: `<span class="${spanClass}">${t(
          itemTypeToTextKey(gradeTouse)
        )}</span> ${t('generic.cards')}`
      })
    }
    return
  }, [emptyListType, t])

  if (numSearchResults !== 0) return null

  return (
    <EmptyItemsList
      subText={subText}
      ctaText={buttonInfo?.text}
      ctaClick={buttonInfo?.onClick}
      bgSrc={src}
    />
  )
})

MarketCardsEmptyList.displayName = 'MarketCardsEmptyList'
