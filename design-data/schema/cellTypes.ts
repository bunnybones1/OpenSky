import { getParsedCardDescription } from '@opensky/parse-card-description'
import t, { Infer, ValidationError } from 'myzod'

import * as options from './options'
import { noDuplicates } from './utils'

/**
 * This file is for data validation rules for individual cels.
 * Cell types don't include any inter-cel validation rules.
 * e.g. We don't assert that Strength Prism cards are ID 1-999,
 * or that Units have a `unit-` prefixed art slug.
 * Those rules live in the schemas.
 */

export const spellArtSlug = t.string({
  pattern: new RegExp(`^spell-(${options.artistNames.join('|')})+-\\d{2,3}$`)
})
export const unitArtSlug = t.string({
  pattern: new RegExp(`^unit-(${options.artistNames.join('|')})+-\\d{2,3}$`)
})
export const bgArtSlug = t.string({
  pattern: new RegExp(`^bg-(${options.backgroundKinds.join('|')})-\\d{2,3}$`)
})
export const heroArtSlug = t.string({
  pattern: new RegExp(`^hero-[a-z]+-\\d{2,3}$`)
})
export const crystalArtSlug = t.string({
  pattern: new RegExp(`^opensky-crystal-\\d{1,2}$`)
})

export const artStatus = t.literals(...options.artStatuses)
export type ArtStatus = Infer<typeof artStatus>

export const artMarketingUsage = t.literals(...options.artMarketingUsages)
export const artRace = t.string()
export const artSlug = t.union([
  spellArtSlug,
  unitArtSlug,
  bgArtSlug,
  heroArtSlug,
  crystalArtSlug
])

export const integerString = t.string({
  predicate: str => {
    const num = Number.parseInt(str, 10)
    if (Number.isNaN(num)) {
      return false
    }
    if (`${num}` !== str) {
      return false
    }
    return true
  }
})

export const cardID = integerString.withPredicate(
  str => {
    const num = Number.parseInt(str, 10)
    return (num > 0 && num < 5999) || (num >= 20000 && num < 39999)
  },
  `Invalid card ID.
Must be between 1 and 5999 (for deckbuildable cards),
Between 20000 and 24999 for token cards,
Between 25000 and 30000 for hero abilities,
between 30000 and 39999 for tutorial cards.`
)

export const cardManaCost = t
  .literals('no', 'X')
  .or(t.number({ min: 0, max: 99 }).withPredicate(Number.isInteger))
export type CardManaCost = Infer<typeof cardManaCost>

export const cardPowerOrHealth = t
  .number({ min: 0, max: 99 })
  .withPredicate(Number.isInteger)
  .optional()

export const cardEnglishName = t.string({
  min: 1,
  max: 90,
  pattern: /^[A-Z][A-Za-z0-9 ,'\-!.&]+[A-Za-z0-9.!]$/
})

export const cardEnglishBodyText = t
  .string()
  .withPredicate(text => {
    try {
      getParsedCardDescription(
        text,
        () => '',
        () => ''
      )
    } catch (err) {
      throw new ValidationError(`Failed to parse card body text: ${err}`)
    }
    return true
  })
  .optional()

export const cardTraits = t
  .array(t.literals(...options.traits))
  .withPredicate(
    noDuplicates,
    values => `Duplicate traits: ${values.join(', ')}`
  )
  .withPredicate(
    t => !t.includes('guard') || !t.includes('stealth'),
    'Cannot have both guard and stealth.'
  )
export type CardTraits = Infer<typeof cardTraits>

export const cardElement = t.literals(...options.elements)
export type CardElement = Infer<typeof cardElement>

export const cardPrism = t.literals(...options.prisms)
export type CardPrism = Infer<typeof cardPrism>

export const cardType = t.literals(...options.types)
export type CardType = Infer<typeof cardType>

export const cardSpellBehaviour = t
  .literals(...options.spellBehaviours)
  .optional()

export const cardFlavorText = t.string().withPredicate(text => {
  try {
    getParsedCardDescription(
      text,
      () => {
        throw new Error("Don't use card IDs in flavor text!")
      },
      () => ''
    )
  } catch (err) {
    throw new ValidationError(`Failed to parse card flavor text: ${err}`)
  }
  return true
})

export const cardSet = t.literals(...options.sets)
export const cardRarity = t.literals(...options.rarities).optional()

export const cardReleaseSeason = t
  .number()
  .withPredicate(Number.isInteger)
  .withPredicate(
    num => Number.isInteger(num) && num < 100 && (num === 0 || num >= 17),
    'Release Season must be 0, for cards that should be released as soon as pushed to production, or a season in the future.'
  )

export const cardDraftPoolType = t.literals(...options.draftPoolType).optional()

export const cardGameDesignStatus = t
  .literals(...options.gameDesignStatus)
  .optional()

export const assetsHash = t.string({ predicate: str => str.length === 32 })

export const vocabType = t.literals(...options.vocabType)

export const questID = t
  .string()
  .pattern(/[A-Za-z]/, 'Only letters A-Z, a-z allowed in Quest IDs.')
export const questPeriodicity = t.literals(...options.questPeriodicity)

export const hero = t.literals(...options.heroes)

export const listOfCardIDs = t.array(cardID)

export const questDesignedDifficulty = t.literals(
  ...options.questDesignedDifficulties
)
export const questColumn = t.literals(...options.questColumns)

export const itemGrade = t.literals(...options.itemGrades)
export type ItemGrade = Infer<typeof itemGrade>

export const hexColor = t.string({
  pattern: /^#[0-9a-f]+$/
})
export const crystalID = integerString
export const cardBackID = integerString
export const heroSkinID = integerString

export const vocabIcon = t.literals(...options.vocabIcons)
export type VocabIcon = Infer<typeof vocabIcon>
