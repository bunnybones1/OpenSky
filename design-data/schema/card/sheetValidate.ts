import { textSegmentsOrError } from '@opensky/parse-card-description'
import { Infer, ValidationError } from 'myzod'
import { _bareCardSchema } from './single/struct'
import { prismFromCardID } from '../helpers'

export function allCardDescriptionsParseWithCardReferences(
  cards: Record<string, Infer<typeof _bareCardSchema>>
) {
  const cardErrors: Record<string, ValidationError> = {}
  for (const [thisCardId, card] of Object.entries(cards)) {
    if (!card.text) {
      continue
    }
    const { cardDescriptionParseSuccess } = textSegmentsOrError(
      card.text,
      id => {
        if (!cards[id]) {
          cardErrors[thisCardId] = new ValidationError(
            `Card ${card.name} names card ${id} in its text, but no card with id ${id} exists.`,
            [thisCardId, 'text']
          )
          return ''
        }
        return cards[id].name
      },
      (_str: string) => {
        // TODO consider adding to badTranslations and checking these :)
        return '!!not implemented !!'
      }
    )
    if (!cardDescriptionParseSuccess) {
      cardErrors[thisCardId] = new ValidationError(
        `Card ${card.name} failed to parse text`,
        [thisCardId, 'text']
      )
    }
  }

  if (Object.keys(cardErrors).length) {
    throw new ValidationError(`Invalid Card Text`, undefined, cardErrors)
  }
  return true
}

export function allCardIdsMatchPrisms(
  cards: Record<string, Infer<typeof _bareCardSchema>>
) {
  const cardErrors: Record<string, ValidationError> = {}
  for (const [thisCardId, card] of Object.entries(cards)) {
    const expectedPrism = prismFromCardID(thisCardId)
    if (expectedPrism && expectedPrism !== card.prism) {
      cardErrors[thisCardId] = new ValidationError(
        `Non-Hero Card ${card.name} has an invalid id ${card.prism} for its ID`,
        [thisCardId, 'prism']
      )
    }
  }
  if (Object.keys(cardErrors).length) {
    throw new ValidationError(`Invalid Prisms`, undefined, cardErrors)
  }
  return true
}