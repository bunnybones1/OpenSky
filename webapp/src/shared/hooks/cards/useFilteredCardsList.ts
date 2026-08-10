/* eslint-disable valtio/state-snapshot-rule */
import { i18n } from '@opensky/language-manager'
import { isExpectedBoldable } from '@opensky/parse-card-description'
import { getGradedID } from '@opensky/shared/assetsIDs'
import { BaseCard } from '@skyweaver/state-metadata'
import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { BaseCards, CARD_ITEM_TYPES, Cards, CardType } from '~/shared/constants/cards'
import { cardAlphaSort } from '~/shared/helpers/cards/alpha-mana-card-sort'
import { doesCardMatchSearch } from '~/shared/helpers/cards/does-card-match-search'
import { getMentionedCard } from '~/shared/helpers/cards/get-mentioned-card'
import { getSortedCardIds } from '~/shared/helpers/cards/get-sorted-cards-ids'
import { Criteria, filterItems } from '~/shared/helpers/filter-items'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  CARD_SORTING_OPTIONS,
  CardCost,
  CardSearchParams,
  OwnershipFilter,
  Set
} from '~/shared/types/cards'

import { getCardTexts } from './useCardTexts'

type BaseSearchCardFilters = Omit<CardSearchParams, 'ownership' | 'grade' | 'sort'>

type ItemsCardsSearchCriteria = {
  [K in keyof BaseSearchCardFilters]: BaseSearchCardFilters[K] | undefined
}

const CARD_FILTER_CRITERIA: Criteria<CardType, ItemsCardsSearchCriteria> = {
  cost: {
    isApplied: (value) => !!value?.length,
    isFiltered: (card, value) => {
      if (!value) return false
      if (card.cost === 'X') return value.includes('X')
      if (typeof card.cost === 'number' && card.cost > 9) return value.includes('10+')
      return value.includes(String(card.cost) as CardCost)
    }
  },
  prism: {
    isApplied: (value) => !!value?.length,
    isFiltered: (card, value) => {
      return (
        !!value &&
        card.prism !== 'tut' &&
        card.prism !== 'tok' &&
        value.includes(card.prism)
      )
    }
  },
  type: {
    isApplied: (value) => !!value,
    isFiltered: (card, value) => {
      return !!value && value === card.type
    }
  },
  element: {
    isApplied: (value) => !!value?.length,
    isFiltered: (card, value) => {
      return !!value && value.includes(card.element)
    }
  },
  trait: {
    isApplied: (value) => !!value?.length,
    isFiltered: (card, value) => {
      if (!value) return false
      return card.traits.some((keyword) => {
        return value.includes(keyword)
      })
    }
  },
  effects: {
    isApplied: (value) => !!value?.length,
    isFiltered: (card, value) => {
      if (!value) return false
      // Need special handling for 'UniqueEffect'
      const cardTexts = getCardTexts(card.baseId, i18n.t)

      if (value.includes('Generic')) {
        const hasAUniqueEffect =
          (card.effectTypes.length === 1 && card.effectTypes.includes('Generic')) ||
          (!!cardTexts.description &&
            cardTexts.description.length > 0 &&
            card.effectTypes.some((effect) => effect === 'Internal'))

        if (hasAUniqueEffect) return true
      }

      // Unit Effects
      const hasAUnitEffect = value.some(
        (effect) => !isExpectedBoldable(effect) && card.effectTypes.includes(effect)
      )

      if (hasAUnitEffect) return true

      // Other Effects
      if (!!cardTexts.description) {
        const hasOtherEffect = cardTexts.description.some((td) => {
          return value.some((effect) => {
            return effect.toLowerCase() === td.value.text.toLowerCase()
          })
        })
        if (hasOtherEffect) return true
      }
      return false
    }
  },
  set: {
    isApplied: (value) => !!value?.length,
    isFiltered: (card, value) => {
      return !!value && value.includes(card.set as Set)
    }
  },
  search: {
    isApplied: (value) => !!value,
    isFiltered: (card, value) => {
      if (!value) return false
      let text = value.toLowerCase()
      if (text === 'low cost') text = 'low-cost'
      if (text === 'high cost') text = 'high-cost'
      const cardMatches = doesCardMatchSearch(card, text, i18n.t)
      if (cardMatches) return true

      if (card.attachment !== undefined) {
        const attachedSpell = Cards.get(getGradedID(card.attachment, card.grade))
        if (!!attachedSpell && doesCardMatchSearch(attachedSpell, text, i18n.t))
          return true
      }

      const mentionedCardIds = getMentionedCard(card, i18n.t)

      if (!!mentionedCardIds) {
        return mentionedCardIds.some((mentionedCardId) => {
          const mentionedCard = Cards.get(getGradedID(mentionedCardId, card.grade))
          return !!mentionedCard && doesCardMatchSearch(mentionedCard, text, i18n.t)
        })
      } else {
        return false
      }
    }
  }
}

const useFilteredCards = (
  filters: BaseSearchCardFilters,
  cards: CardType[] | undefined
) => {
  return useMemo(() => {
    if (!cards) return
    let cardsArray = cards

    // Filter out token and tutorial cards
    cardsArray = cardsArray.filter((card) => {
      return card.prism !== 'tut' && card.prism !== 'tok'
    })

    cardsArray = filterItems({
      items: cardsArray,
      criteria: CARD_FILTER_CRITERIA,
      filters
    })

    return cardsArray.map((card) => ({ id: card.id }))
  }, [cards, filters])
}

const useCardsWithOwnership = (
  baseIds: BaseCard[] | undefined,
  {
    ownership,
    grade,
    sort
  }: {
    ownership?: OwnershipFilter
    grade?: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
    sort?: CARD_SORTING_OPTIONS
  }
) => {
  const { userAddress } = useSnapshot(authenticationState)

  const cardBalances = useMultiTypeTokenBalances(CARD_ITEM_TYPES)

  return useMemo(() => {
    if (!baseIds) return
    if (!userAddress && !cardBalances) {
      return baseIds
        .map((_id) => {
          const gradedId = getGradedID(_id, grade || ItemType.SW_BASE_CARDS)
          return Cards.get(gradedId)
        })
        .filter(isDefined)
    }

    if (!cardBalances || !cardBalances.length || !baseIds) return

    return baseIds
      .map((baseId) => {
        const balancesForCard = cardBalances.filter(
          (balance) => String(balance.id) === baseId
        )

        if (!balancesForCard.length) {
          const idToUse = getGradedID(baseId, grade || ItemType.SW_BASE_CARDS)
          return {
            balance: undefined,
            idToUse,
            baseId
          }
        } else {
          const goldBalace = balancesForCard.find(
            (balance) => balance.itemType === ItemType.SW_GOLD_CARDS
          )
          const silverBalance = balancesForCard.find(
            (balance) => balance.itemType === ItemType.SW_SILVER_CARDS
          )
          const baseBalance = balancesForCard.find(
            (balance) => balance.itemType === ItemType.SW_BASE_CARDS
          )

          const highestGrade = !!goldBalace?.balance
            ? ItemType.SW_GOLD_CARDS
            : !!silverBalance?.balance
            ? ItemType.SW_SILVER_CARDS
            : ItemType.SW_BASE_CARDS

          const gradeTouse = grade || highestGrade

          const balanceToUse =
            gradeTouse === ItemType.SW_GOLD_CARDS
              ? goldBalace
              : gradeTouse === ItemType.SW_SILVER_CARDS
              ? silverBalance
              : baseBalance

          return {
            balance: balanceToUse,
            idToUse: getGradedID(baseId, gradeTouse),
            baseId
          }
        }
      })
      .filter(({ balance }) => {
        if (ownership === OwnershipFilter.LOCKED) {
          return !balance || balance.balance === 0
        }
        if (ownership === OwnershipFilter.OWN_MULTIPLE) {
          if (!balance) return false
          return balance.balance > 1
        }
        if (ownership === OwnershipFilter.OWNED) {
          if (!balance) return false
          return balance.balance > 0
        }

        return true
      })
      .sort((a, b) => {
        let sortValue = 0

        if (
          sort === CARD_SORTING_OPTIONS.QUANTITY_ASCENDING ||
          sort === CARD_SORTING_OPTIONS.QUANTITY_DESCENDING
        ) {
          const aBalace = a.balance?.balance || 0
          const bBalance = b.balance?.balance || 0

          if (sort === CARD_SORTING_OPTIONS.QUANTITY_DESCENDING) {
            sortValue = bBalance - aBalace
          } else if (sort === CARD_SORTING_OPTIONS.QUANTITY_ASCENDING) {
            sortValue = aBalace - bBalance
          }
        }

        if (!a.balance || !b.balance) {
          sortValue = 0
        } else if (
          sort === CARD_SORTING_OPTIONS.DATE_RECIEVED_DESCENDING ||
          sort === CARD_SORTING_OPTIONS.DATE_RECIEVED_ASCENDING
        ) {
          const aDate = a.balance.createdAt
          const bDate = b.balance.createdAt

          if (!aDate || !bDate) {
            sortValue = 0
          } else if (sort === CARD_SORTING_OPTIONS.DATE_RECIEVED_DESCENDING) {
            sortValue = new Date(bDate).getTime() - new Date(aDate).getTime()
          } else if (sort === CARD_SORTING_OPTIONS.DATE_RECIEVED_ASCENDING) {
            sortValue = new Date(aDate).getTime() - new Date(bDate).getTime()
          }
        }

        // If the cards have identical sort values, sort them alphabetically
        if (!sortValue) return cardAlphaSort(a.baseId, b.baseId, i18n.t)

        return sortValue
      })
      .map(({ idToUse }) => Cards.get(idToUse))
      .filter(isDefined)
  }, [userAddress, baseIds, cardBalances, grade, ownership, sort])
}

const useListCardBaseIds = () => {
  const { data: seasonInfo } = useSeasonInfo()

  return useMemo(() => {
    if (!seasonInfo) return undefined
    return BaseCards.filter(
      (card) =>
        card.prism !== 'tok' &&
        card.type !== 'enchant' &&
        card.prism !== 'tut' &&
        card.releaseSeason <= seasonInfo.currentSeason
    ).map((card) => card.baseId)
  }, [seasonInfo])
}

export const useFilteredCardsList = (
  filters: CardSearchParams,
  onUpdate?: (numResults: number) => void
) => {
  const baseIds = useListCardBaseIds()

  const cardsWithOwnership = useCardsWithOwnership(baseIds, {
    ownership: !!filters.onlyDuplicates
      ? OwnershipFilter.OWN_MULTIPLE
      : filters.ownership,
    grade: filters.grade,
    sort: filters.sort
  })

  const baseFilters = useMemo<BaseSearchCardFilters>(() => {
    return {
      search: filters.search,
      cost: filters.cost,
      prism: filters.prism,
      element: filters.element,
      trait: filters.trait,
      effects: filters.effects,
      set: filters.set,
      type: filters.type
    }
  }, [
    filters.cost,
    filters.effects,
    filters.element,
    filters.prism,
    filters.search,
    filters.set,
    filters.trait,
    filters.type
  ])

  const filteredCards = useFilteredCards(baseFilters, cardsWithOwnership)

  useEffect(() => {
    if (!!filteredCards && !!onUpdate) {
      onUpdate(filteredCards.length)
    }
  }, [filteredCards, onUpdate])

  return useMemo<{ id: number }[] | undefined>(() => {
    if (!!filters.sort && !!filteredCards) {
      const sortedIds = getSortedCardIds({
        cardIds: (filteredCards || []).map(({ id }) => id),
        sortOption: filters.sort
      })
      return sortedIds.map((id) => ({ id }))
    }
    return filteredCards
  }, [filteredCards, filters.sort])
}
