import t from 'myzod'

import * as cell from '../../cellTypes'

export const _bareCardSchema = t
  .object({
    // All cards
    name: cell.cardEnglishName,
    cost: cell.cardManaCost,
    text: cell.cardEnglishBodyText,
    // if a designer changes the text, we'll need to update the code.
    // this tracks the last code we implemented for this card.
    textLastImplementedAsCode: cell.cardEnglishBodyText,
    traits: cell.cardTraits,
    element: cell.cardElement,
    prism: cell.cardPrism,
    type: cell.cardType,
    artSlug: t.union([cell.spellArtSlug, cell.unitArtSlug]),
    spellBehaviour: cell.cardSpellBehaviour,
    flavorText: cell.cardFlavorText,
    set: cell.cardSet,
    rarity: cell.cardRarity,
    releaseSeason: cell.cardReleaseSeason,

    // Units only
    power: cell.cardPowerOrHealth,
    health: cell.cardPowerOrHealth,
    attachment: cell.cardID.optional(),

    // Hero Abilities only
    startCharges: t.number().optional(),
    maxCharges: t.number().optional(),
    startCounters: t.number().optional(),
    maxCounters: t.number().optional(),
    perTurn: t.number().optional(),

    // For Draft
    draftPoolType: cell.cardDraftPoolType,

    // Game design review stuff:
    notes: t.string().optional(),
    gameDesignStatus: cell.cardGameDesignStatus.optional()
  })
  .collectErrors()
