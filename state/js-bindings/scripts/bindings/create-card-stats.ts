// This script will go through the filesystem design-data, and create a `stats.ts` file in `js-bindings/packages/metadata/src`
// This file contains the stats of each card, in a format matching the `CardMetadata` typescript type.

import { getDesignDataAsObject } from '@opensky/design-data/scripts/data'
import {
  designCardToNoBindingsCardMetadata,
  type NoBindingsCardMetadata
} from '@opensky/design-data/schema/compiledCard'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import {
  designVocabToStatsData,
  VocabStatsData
} from '@opensky/design-data/schema/compiledVocab'
const outputStatsLibFilePath = path.join(
  __dirname,
  '../../packages/metadata/src/stats.ts'
)
const outputCardsLangFilePath = path.join(
  __dirname,
  '../../../../lib/language-manager/locales/en/cards.json'
)
const outputVocabLangFilePath = path.join(
  __dirname,
  '../../../../lib/language-manager/locales/en/vocab.json'
)

async function main() {
  const designData = await getDesignDataAsObject()

  let outputString = `import type { NoBindingsCardMetadata } from '@opensky/design-data/schema/compiledCard'
import type { VocabStatsData } from '@opensky/design-data/schema/compiledVocab'
import type { BaseCard } from '@skyweaver/state-metadata-sys'

export type CardMetadata = Omit<NoBindingsCardMetadata, 'relatedCards'> & {
  relatedCards: BaseCard[]
  attachment?: BaseCard
}

export const CardLibrary = new Map<BaseCard, Readonly<CardMetadata>>()
export const VocabLibrary = new Map<string, Readonly<VocabStatsData>>()

`
  for (const [id, card] of Object.entries(designData.sheets.cards)) {
    const cardMetadata: NoBindingsCardMetadata =
      designCardToNoBindingsCardMetadata(
        id,
        card,
        designData.sheets.art,
        designData.sheets.vocab
      )

    outputString += `CardLibrary.set('${id}', ${JSON.stringify(
      cardMetadata,
      null,
      2
    )})\n`
  }

  for (const [id, vocab] of Object.entries(designData.sheets.vocab)) {
    const vocabStatsData: VocabStatsData = designVocabToStatsData(vocab)
    outputString += `VocabLibrary.set('${id}', ${JSON.stringify(
      vocabStatsData,
      null,
      2
    )})\n`
  }

  await writeFile(outputStatsLibFilePath, outputString)

  const cards = Object.entries(designData.sheets.cards).map(([id, card]) => [
    id,
    {
      name: card.name,
      description: card.text?.replaceAll('\r\n', '\n').trimEnd(),
      flavorText: card.flavorText.replaceAll('\r\n', '\n').trimEnd()
    }
  ])
  cards.push(
    [
      'Dummy',
      {
        description: 'Silly me!',
        flavorText: "I don't know anything!!",
        name: 'Dummy Card'
      }
    ],
    [
      'Hero',
      {
        description: '!',
        flavorText: '',
        name: 'Hero'
      }
    ]
  )
  const cardsLang = JSON.stringify(Object.fromEntries(cards), null, 2)
  await writeFile(outputCardsLangFilePath, cardsLang)

  const vocab = Object.entries(designData.sheets.vocab).map(([id, vocab]) => [
    id,
    { title: vocab.title, text: vocab.text }
  ])

  const vocabLang = JSON.stringify(Object.fromEntries(vocab), null, 2)
  await writeFile(outputVocabLangFilePath, vocabLang)
}

main()
