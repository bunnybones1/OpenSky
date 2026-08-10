import * as path from 'path'
import * as fs from 'fs'

import { execSync } from 'child_process'
import { getCardsAsObject } from '@opensky/design-data/scripts/data'
import { Card } from '@opensky/design-data/schema'

const baseFolder = path.join(__dirname, '..', '..')
const cardsFolder = path.join(baseFolder, 'cards')

const CSV_PATH = `${cardsFolder}/analytics_card_library.csv`

async function main() {
  const gitStatus = execSync('git branch --show-current').toString().trim()
  if (gitStatus !== 'release') {
    console.error(
      'You must be on the release branch to run this script, otherwise you can leak unreleased cards.'
    )
    process.exit(1)
  }
  const cards = await getCardsAsObject()
  let parsedCardData = Object.entries(cards).map(processCardToCSV).join('\n')
  const headings =
    'ID,name,cost,power,health,prism,element,type,set,releaseSeason,description\n'
  let csvData = headings.concat(parsedCardData)
  try {
    fs.writeFileSync(CSV_PATH, csvData)
    console.log(
      'Generated analytics card library data to analytics_card_library.csv'
    )
  } catch (err) {
    console.error(err)
  }
}

export function processCardToCSV([id, c]: [id: string, c: Card]): String {
  return `${id},"${c.name}",${c.cost},${c.power},${c.health},${c.prism},${c.element},${c.type},"${c.set}",${c.releaseSeason},"${c.text}"`
}

main()
