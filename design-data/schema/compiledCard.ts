import {
  CardDescriptionToken,
  getParsedCardDescription
} from '@opensky/parse-card-description'
import { Card } from './card'
import { ArtSheetType } from './art'
import { VocabSheetType } from './vocab'

export const cardPickedMetadataProps = [
  'prism',
  'element',
  'traits',
  'type',
  'cost',
  'health',
  'power',
  'startCharges',
  'maxCharges',
  'startCounters',
  'maxCounters',
  'perTurn',
  'artSlug',
  'attachment',
  'spellBehaviour',
  'set',
  'releaseSeason'
] satisfies Array<keyof Card>

type CardPickedMetadataProps = (typeof cardPickedMetadataProps)[number]

type PickedCard = Pick<Card, CardPickedMetadataProps>

export type NoBindingsCardMetadata = PickedCard & {
  backgroundArtSlug: string
  relatedCards: string[]
  textVocab: string[]
  effectTypes: EffectType[]
}

export function designCardToNoBindingsCardMetadata(
  cardID: string,
  card: Card,
  artSheet: ArtSheetType,
  vocabSheet: VocabSheetType
): NoBindingsCardMetadata {
  const picked: Record<string, any> = {}
  for (const prop of cardPickedMetadataProps) {
    picked[prop] = card[prop]
  }
  // This is a dangerous type-assert. This will only be correct if the above loop is correct.
  const finishedPicked = picked as PickedCard

  const cardIDAsNumber = Number.parseInt(cardID, 10)
  if (Number.isNaN(cardIDAsNumber)) {
    throw new Error(`Card ID ${cardID} is not a number!`)
  }
  const backgroundArtSlug =
    artSheet[card.artSlug]?.bgId ??
    `bg-${card.element !== 'sky' ? card.element : 'air'}-0${
      (cardIDAsNumber % 3) + 1
    }`

  const parsedText = getParsedCardDescription(
    card.text ?? '',
    id => `${id}`,
    (transKey: string) => `${transKey}`
  )

  const relatedCards = getRelatedCards(parsedText, cardID)

  const textVocab = getVocab(card, vocabSheet)

  const effectTypes = getEffectTypes(parsedText)
  return {
    ...finishedPicked,
    backgroundArtSlug,
    relatedCards,
    textVocab,
    effectTypes
  }
}

// TODO Make sure "Summon & Death" adds both tooltips!
function getVocab(card: Card, vocabSheet: VocabSheetType): string[] {
  const textVocab = new Set<string>()
  const lowerText = (card.text ?? '').toLowerCase()

  for (const [vocabID, vocab] of Object.entries(vocabSheet)) {
    if (vocab.restrict && vocab.restrict !== card.type) {
      continue
    }
    const lowerKw = vocab.pattern.toLowerCase()
    if (
      lowerText.includes(lowerKw) ||
      // is a multi-trigger
      (lowerText.includes('{trigger:') &&
        lowerText.includes('&') &&
        (lowerText.includes(lowerKw.replace(/\{trigger:/, '')) ||
          lowerText.includes(lowerKw.replace(/\:}/, ''))))
    ) {
      textVocab.add(vocabID)
    }
  }
  return [...textVocab]
}

function getRelatedCards(
  parsedText: CardDescriptionToken[],
  cardID: string
): string[] {
  // Sets are ordered by insertion order, so we don't need to use an array & check ownership.
  const relatedCards = new Set<string>()
  const runes = [1081, 1072, 3061, 3035, 4031, 86, 60, 2087]
  const blades = [37, 82, 87, 132, 182, 183, 1000, 1027]
  for (const item of parsedText) {
    if (item.type === 'card') {
      relatedCards.add(item.value.cardId)
    } else if (item.type === 'bold' && item.value.boldable === 'rune') {
      for (const rune of runes) {
        relatedCards.add(`${rune}`)
      }
    } else if (item.type === 'bold' && item.value.boldable === 'blade') {
      for (const blade of blades) {
        relatedCards.add(`${blade}`)
      }
    }
  }
  // we should never be related to ourselves, so delete our ID just in case it got added.
  relatedCards.delete(cardID)

  return [...relatedCards]
}

const triggerRegex = /(.+?)(:|$)/

function getEffectTypes(desc?: CardDescriptionToken[]): EffectType[] {
  if (!desc) {
    return []
  }

  const triggerTokens = desc.filter(t => t.type === 'trigger')
  const tokensWithTriggerText = desc.filter(
    t =>
      t.type === 'trigger' &&
      (t.value.isAura || t.value.kind.match(triggerRegex))
  )
  if (!triggerTokens.length) {
    return []
  }

  if (!tokensWithTriggerText.length) {
    return ['Generic']
  }

  return triggerTokens
    .map(token => {
      if (token.type !== 'trigger') {
        throw new Error("unreachable: token.type !== 'trigger'")
      }
      if (token.value.isAura) {
        return 'Continuous'
      }
      const matched = token.value.kind.match(triggerRegex)

      const trigger = matched?.[1] ?? ''
      const type = (
        trigger.includes('Inspire') ? trigger.split(' ')[0] : trigger
      )
        .replace(' ', '')
        .replace('&', '')
      return type.length ? (type === ':' ? null : type) : 'Generic'
    })
    .filter(t => t != null) as EffectType[]
}
export const effectTypes = [
  'Death',
  'Glory',
  'Inspire',
  'Play',
  'Summon',
  'Generic',
  'Sunrise',
  'Sunset',
  'Continuous',
  'Internal',
  'Slay',
  'Choose'
] as const
export type EffectType = (typeof effectTypes)[number]
