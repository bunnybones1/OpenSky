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
import { deckBuilderFilterState } from '~/shared/state/deck-builder/deck-builder-filter-state'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'

import { BaseSubText, GoldSubText, SilverSubText } from './EmptyDeckBuilderList.css'

type EmptyListType =
  | 'noResults'
  | 'noGolds'
  | 'noSilver'
  | 'noBase'
  | 'noBasePractice'
  | 'noBaseTutorial'
  | 'fullyUnlocked'

export const EmptyDeckBuilderList = memo(() => {
  const { grade } = useSnapshot(deckBuilderFilterState)
  const { numSearchResults } = useSnapshot(deckBuilderState)
  const { data: account } = useAuthedAccount()
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  const dispatch = useDispatch()
  const emptyListType = useMemo<EmptyListType>(() => {
    if (!grade || !account) return 'noResults'
    if (grade === ItemType.SW_GOLD_CARDS) return 'noGolds'
    if (grade === ItemType.SW_SILVER_CARDS) return 'noSilver'
    if (grade === ItemType.SW_BASE_CARDS) {
      if (account && account.level >= 15) return 'noBase'
      if (account && account.level >= 5) return 'noBasePractice'
      if (account && account.level < 5) return 'noBaseTutorial'
      return 'noResults'
    }

    return 'noResults'
  }, [grade, account])

  const buttonInfo = useMemo(() => {
    if (emptyListType === 'noResults' || emptyListType === 'fullyUnlocked')
      return null

    if (emptyListType === 'noSilver' || emptyListType === 'noBase') {
      return {
        text: `${t('generic.Play')} ${t('generic.Ranked')}`,
        onClick: () =>
          dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath))
      }
    }
    if (emptyListType === 'noBasePractice') {
      return {
        text: `${t('generic.Play')} ${t('generic.Practice')}`,
        onClick: () =>
          dispatch(
            push(ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath)
          )
      }
    }

    if (emptyListType === 'noBaseTutorial') {
      return {
        text: `${t('generic.Play')} ${t('generic.Tutorial')}`,
        onClick: () =>
          dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.directPath))
      }
    }
    return {
      text: `${t('generic.Play')} ${t('generic.Conquest')}`,
      onClick: () =>
        dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath))
    }
  }, [dispatch, emptyListType, t])

  const src = useMemo(() => {
    if (!getAssetUrl) return
    if (emptyListType === 'noGolds')
      return getAssetUrl('webapp/backgrounds/empty-list-gold.webp')
    if (emptyListType === 'noSilver')
      return getAssetUrl('webapp/backgrounds/empty-list-silver.webp')
    if (emptyListType === 'noResults')
      return getAssetUrl('webapp/backgrounds/empty-list-noresults.webp')
    return
  }, [emptyListType, getAssetUrl])

  const subText = useMemo(() => {
    if (emptyListType !== 'noResults' && emptyListType !== 'fullyUnlocked') {
      const gradeTouse =
        emptyListType === 'noGolds'
          ? ItemType.SW_GOLD_CARDS
          : emptyListType === 'noSilver'
          ? ItemType.SW_SILVER_CARDS
          : ItemType.SW_BASE_CARDS
      const spanClass =
        emptyListType === 'noGolds'
          ? GoldSubText
          : emptyListType === 'noSilver'
          ? SilverSubText
          : BaseSubText

      return t('search.emptySearchSub', {
        action: `<span class="${BaseSubText}">${t(
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

EmptyDeckBuilderList.displayName = 'EmptyDeckBuilderList'
