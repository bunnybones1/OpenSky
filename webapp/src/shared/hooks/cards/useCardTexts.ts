import { i18n, SupportedLanguage } from '@opensky/language-manager'
import {
  CardDescriptionToken,
  getParsedCardDescription,
  joinParsedDescription
} from '@opensky/parse-card-description'
import { BaseCard } from '@skyweaver/state-metadata'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface ParsedCardText {
  name: string
  description: CardDescriptionToken[]
  flavorText: CardDescriptionToken[]
  parsedDescription: string
  parsedFlavorText: string
}

type CardTextCache = {
  [key in SupportedLanguage]?: {
    [key in BaseCard]?: ParsedCardText
  }
}

const CARD_TEXT_CACHE: CardTextCache = {}

export const getCardTexts = (baseId: BaseCard, t: (typeof i18n)['t']) => {
  const locale = i18n.language as SupportedLanguage

  const localeCache = CARD_TEXT_CACHE[locale]

  if (!!localeCache && !!localeCache[baseId]) {
    return localeCache[baseId] as ParsedCardText
  }

  const name = t(`cards:${baseId}.name`)

  const description = getParsedCardDescription(
    t(`cards:${baseId}.description`) ?? '',
    (id) => t(`cards:${`${id}` as BaseCard}.name`) ?? '',
    t
  )

  const flavorText = getParsedCardDescription(
    t(`cards:${baseId}.flavorText`) ?? '',
    () => {
      throw new Error("Don't use Card IDs in flavor text!")
    },
    t
  )

  const parsedTexts = {
    name,
    description,
    flavorText,
    parsedDescription: description
      .reduce((prev, cur) => `${prev}${cur.value.text}`, '')
      .replace(/[\u00A0]/g, ' '),
    parsedFlavorText: joinParsedDescription(flavorText)
  }

  if (!localeCache) {
    CARD_TEXT_CACHE[locale] = { [baseId]: parsedTexts }
  } else {
    localeCache[baseId] = parsedTexts
  }

  return parsedTexts
}

export const useGetCardTexts = () => {
  const { t } = useTranslation()
  const _getCardTexts = useCallback(
    (baseId: BaseCard) => {
      return getCardTexts(baseId, t)
    },
    [t]
  )

  return { getCardTexts: _getCardTexts }
}

export type GetCardTexts = ReturnType<typeof useGetCardTexts>['getCardTexts']

export const useCardTexts = (baseId?: BaseCard) => {
  const { getCardTexts } = useGetCardTexts()

  return useMemo(() => {
    if (!baseId) return null
    return getCardTexts(baseId)
  }, [baseId, getCardTexts])
}

export const useCardFlavorText = (baseId?: BaseCard) => {
  const cardTexts = useCardTexts(baseId)

  return useMemo(() => {
    if (!cardTexts) return

    const { flavorText } = cardTexts

    const text = flavorText
      .filter((flavor) => flavor.type !== 'explainer')
      .map(({ value }) => value.text)
      .join(' ')
    const explainer = flavorText.find((flavor) => flavor.type === 'explainer')?.value
      .text as string | undefined

    const dashIndex = text.lastIndexOf('-')
    const author = dashIndex !== -1 ? text.slice(dashIndex + 1).trim() : ''
    const originalText = text.slice(0, dashIndex).trim()

    return {
      text: originalText,
      explainer,
      author
    }
  }, [cardTexts])
}
