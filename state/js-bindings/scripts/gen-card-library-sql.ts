import { createWriteStream, readdirSync } from 'fs-extra'
import { i18n, i18nInit } from '@opensky/language-manager'
import * as path from 'path'

import {
  getParsedCardDescription,
  joinParsedDescription
} from '@opensky/parse-card-description'
import { CardSet } from '@opensky/proto'
import { getCardsAsObject } from '@opensky/design-data/scripts/data'
import {
  CardElement,
  CardPrism,
  CardType
} from '@opensky/design-data/schema/cellTypes'

const main = async () => {
  await i18nInit({ defaultNS: 'translation', lng: 'en', version: '' })

  const migrationsDir = path.resolve(
    __dirname,
    '../../../api/data/schema/migrations/'
  )
  const oldMigrationsHighestID = readdirSync(migrationsDir)
    .filter(fname => fname.includes('_') && fname.includes('.sql'))
    .reduce(
      (highest, fname) => Math.max(highest, parseInt(fname.split('_')[0], 10)),
      0
    )
  const targetFile = path.resolve(
    migrationsDir,
    `${oldMigrationsHighestID + 1}_card_library.sql`
  )

  const cards = await getCardsAsObject()

  const sqlEscapeString = (s: string) => s.split("'").join("''")

  const parseNumber = (v: any): number => {
    const n: number = parseInt(v)
    if (!n) {
      return 0
    }
    return n
  }

  const records: string[] = []

  const cardIndex: Record<string, boolean> = {}

  for (const [cardID, card] of Object.entries(cards)) {
    // Omit tutorial cards from the SQL.
    if (card.prism === 'tut') {
      continue
    }
    if (cardIndex[cardID] !== undefined) {
      console.log('wtf... we have a duplicate cardID:', cardID)
      console.log('exiting...')
      process.exit(1)
    }

    // Convert to ENUMS relevant fields
    const prism_enum = [
      'str',
      'hrt',
      'agy',
      'int',
      'wis',
      'tok'
    ] as const satisfies ReadonlyArray<CardPrism>

    const element_enum = [
      'water',
      'fire',
      'earth',
      'air',
      'mind',
      'metal',
      'light',
      'dark',
      'sky'
    ] as const satisfies ReadonlyArray<CardElement>

    const type_enum = [
      'unit',
      'spell'
    ] as const satisfies ReadonlyArray<CardType>

    // Get fields value
    const releaseSeason = card.releaseSeason
    const name = sqlEscapeString(card.name)
    let prism = prism_enum.indexOf(card.prism)
    if (prism === -1) {
      prism = prism_enum.indexOf('tok')
    }
    const asset = card.artSlug
    const element = element_enum.indexOf(card.element)
    const manaCost =
      card.cost === 'X' || card.cost === 'no' ? -1 : parseNumber(card.cost)
    const power = parseNumber(card.power)
    const health = parseNumber(card.health)
    const type =
      card.type == 'enchant' || card.type == 'heroAbility'
        ? type_enum.indexOf('spell')
        : card.type === 'hero'
        ? type_enum.indexOf('unit')
        : type_enum.indexOf(card.type)
    const rarity = prism === prism_enum.indexOf('tok') ? 'T' : '$'

    let description = card.text
    description = description ? description.replace('\n', '') : ''
    description = sqlEscapeString(description)
    let parsedDescription = getParsedCardDescription(
      card.text ?? '',
      id => {
        const associatedCard = cards[id]
        if (!associatedCard) {
          throw new Error(
            `When getting card description for card ${name} (${cardID}), failed to find associated card with id ${id} in data.cards.`
          )
        }
        return associatedCard.name
      },
      i18n.t
    )
    let joinedParsedDescription = joinParsedDescription(
      parsedDescription
    ).replace('\n', '')
    joinedParsedDescription = sqlEscapeString(joinedParsedDescription)

    let cardKeywords: string[] = card.traits

    const attachedSpellID = card.attachment
    if (attachedSpellID != null) {
      const attachment = cards[attachedSpellID]
      if (!attachment) {
        throw new Error(
          `Attachment ${attachedSpellID} on card ${cardID} ${card.name} doesn't exist!`
        )
      }
      cardKeywords = cardKeywords.concat(attachment.name)
    }

    const keywords =
      cardKeywords.length > 0
        ? `{${cardKeywords
            .map((word: string) => word.toUpperCase().replace(/[^A-Z0-9]/, ''))
            .reduce((res: any, cur: any) => res + ', ' + cur)}}`
        : '{}'

    cardIndex[cardID] = true

    const parseCardDescriptionStr = sqlEscapeString(
      JSON.stringify(parsedDescription)
    )

    // Card set / expansion
    const expansions = Object.keys(CardSet)
    const setString = card.set
      .toUpperCase()
      .replace(/ /g, '_') as keyof typeof CardSet
    if (!expansions.includes(setString)) {
      throw new Error(
        `Card ${cardID} is of set ${setString}. Expected one of ${expansions}.`
      )
    }
    const set = expansions.indexOf(setString)

    records.push(
      `('${cardID}','${name}','${description}','${joinedParsedDescription}','${asset}','${prism}','${element}','${type}','${manaCost}','${power}','${health}',${
        attachedSpellID ?? 'null'
      },'${keywords}', '0', '${rarity}', '${parseCardDescriptionStr}', '${set}', ${releaseSeason})`
    )
  }

  const stream = createWriteStream(targetFile, { flags: 'ax' })
  stream.write(`
-- +goose Up
-- THIS FILE IS GENERATED BY \`pnpm gen-card-sql\` IN /STATE
-- SQL in this section is executed when the migration is applied.
DELETE FROM cards;

SELECT nextval('public.cards_revision_seq'::regclass);

INSERT INTO cards
	("id", "name", "description", "parsed_description", "asset", "class", "element", "type", "mana_cost", "power", "health", "attached_spell_id", "keywords", "status", "rarity", "attributes", "set", "valid_from_season")
VALUES
${records.reduce((res: any, cur: any) => res + ',\n' + cur)};

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DELETE FROM cards;
`)
  stream.end()

  console.log('[generated] ', targetFile)
}
main()
