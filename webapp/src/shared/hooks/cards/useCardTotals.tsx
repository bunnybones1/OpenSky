import { useMemo } from 'react'

import { BaseCards } from '~/shared/constants/cards'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'

export const useCardTotals = (excludeLatestExpansion?: boolean) => {
  const { data: seasonInfo } = useSeasonInfo()

  return useMemo(() => {
    const cardsArray = Array.from(BaseCards).filter(
      (card) =>
        card.prism !== 'tok' && card.type !== 'enchant' && card.prism !== 'tut'
    )

    // In order to exclude the latest season, we need to find the
    // latest card release season (seasons can progress without card releases
    // so we cant use seasonInfo.currentSeason)
    let latestExpansionSeason: number | undefined

    cardsArray.forEach((card) => {
      if (
        !!card.releaseSeason &&
        (!latestExpansionSeason || card.releaseSeason > latestExpansionSeason) &&
        (!seasonInfo || card.releaseSeason <= seasonInfo.currentSeason)
      ) {
        latestExpansionSeason = card.releaseSeason
      }
    })

    const filteredCardsArray = cardsArray.filter((card) => {
      if (!!card.releaseSeason) {
        if (!!excludeLatestExpansion && !!latestExpansionSeason) {
          if (card.releaseSeason >= latestExpansionSeason) {
            return false
          }
        }
        if (!!seasonInfo) {
          if (card.releaseSeason > seasonInfo.currentSeason) return false
        }
      }
      return true
    })

    return filteredCardsArray.reduce(
      (prev, card) => ({
        ...prev,
        [card.prism.toUpperCase()]: prev[card.prism.toUpperCase()] + 1,
        TOTAL: prev.TOTAL + 1
      }),
      {
        HRT: 0,
        STR: 0,
        WIS: 0,
        AGY: 0,
        INT: 0,
        TOTAL: 0
      }
    )
  }, [excludeLatestExpansion, seasonInfo])
}
