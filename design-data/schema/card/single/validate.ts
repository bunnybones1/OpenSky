import { Infer, ValidationError } from 'myzod'
import { _bareCardSchema } from './struct'

export function onlyHeroAbilitiesHaveChargesCountersAndPerTurn(
  card: Infer<typeof _bareCardSchema>
) {
  const onlyHeroAbility = [
    'startCharges',
    'maxCharges',
    'startCounters',
    'maxCounters',
    'perTurn'
  ] as const
  const inCard = onlyHeroAbility.filter(key => key in card && card[key])
  if (card.type !== 'heroAbility' && inCard.length) {
    throw new ValidationError(
      `Card "${card.name} is a ${card.type}, but has hero-ability-only propert${
        inCard.length === 1 ? 'y' : 'ies'
      } ${inCard.join(',')} `,
      inCard
    )
  }
  return true
}

export function artSlugTypeMatchesCardType(
  card: Infer<typeof _bareCardSchema>
) {
  // a card's art slug can be validated by if it's a unit or a spell.
  const artType = card.artSlug.split('-')[0]
  if (card.type === 'unit') {
    if (artType !== 'unit') {
      throw new ValidationError(
        `Card is a Unit, but has art "${card.artSlug}"`,
        ['type']
      )
    }
  } else if (
    card.type === 'spell' ||
    card.type === 'enchant' ||
    card.type === 'heroAbility'
  ) {
    if (artType !== 'spell') {
      throw new ValidationError(
        `Card is a ${card.type}, but has art "${card.artSlug}".`,
        ['type']
      )
    }
  } else if (card.type === 'hero') {
    if (artType !== 'hero') {
      throw new ValidationError(
        `Card is a Hero, but has art "${card.artSlug}".`,
        ['type']
      )
    }
  } else {
    const badType: never = card.type
    throw new ValidationError(`Unknown card type ${badType}`, ['type'])
  }
  return true
}

export function onlyUnitsHavePowerAndHealth(
  card: Infer<typeof _bareCardSchema>
) {
  // A spell, enchant, or hero ability should never have power or health.
  // A unit must always have power and health.
  if (card.type === 'unit' && card.power === undefined) {
    throw new ValidationError(`Card is a Unit, but has no power`, ['power'])
  }
  if (card.type === 'unit' && card.health === undefined) {
    throw new ValidationError(`Card is a Unit, but has no health`, ['health'])
  }
  if (card.type !== 'unit' && card.power !== undefined) {
    throw new ValidationError(
      `Card "${card.name}" is not a Unit, but has power ${card.power}`,
      ['power']
    )
  }
  if (card.type !== 'unit' && card.health !== undefined) {
    throw new ValidationError(
      `Card "${card.name}" is not a Unit, but has health ${card.health}`,
      ['health']
    )
  }
  return true
}

export function onlyUnitsHaveAttachments(card: Infer<typeof _bareCardSchema>) {
  // Attachments are only legal on Units.
  if (card.type !== 'unit' && card.attachment !== undefined) {
    throw new ValidationError(
      `Card "${card.name}" is not a Unit, but has an attachment: ${card.attachment}`,
      ['attachment']
    )
  }
  return true
}

export function elementMatchesCardType(card: Infer<typeof _bareCardSchema>) {
  if (card.type !== 'heroAbility' && card.element === 'sky') {
    throw new ValidationError(
      `Card "${card.name}" is not a Hero Ability, but is element "sky". Only Hero Abilities can be element "sky".`,
      ['element']
    )
  }
  return true
}
