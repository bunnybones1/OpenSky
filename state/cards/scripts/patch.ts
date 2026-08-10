import * as path from 'path'
import * as readline from 'readline'
import * as fs from 'fs'
import { Card } from '@opensky/design-data/schema'
import {
  getCardsAsObject,
  getDesignDataAsObject
} from '@opensky/design-data/scripts/data'
import { sheetsFolderPath } from '@opensky/design-data/scripts/dataLocations'
import {
  getParsedCardDescription,
  joinParsedDescription
} from '@opensky/parse-card-description'
import { i18nInit, i18n, supportedLanguages } from '@opensky/language-manager'

// command line options
const options = ['status', 'card', 'mark', 'exit']
main()
async function main() {
  await i18nInit({ lng: 'en', version: '', defaultNS: 'translation' })
  const passedArgs = process.argv.slice(2).map(a => a.trim())
  if (passedArgs.length > 0) {
    run(passedArgs)
  } else {
    console.log('Entering interactive patcher')
    let command: string[] = ['']
    while (command.length > 0) {
      console.log(`options: ${options.join(', ')}`)
      let next = await askQuestion('>>> ')
      command = next.split(' ')
      await run(command)
    }
  }
}

async function run(args: string[]) {
  const [arg, ...rest] = args
  if (arg === 'status') {
    await patchStatus()
  } else if (arg === 'mark') {
    await markCard(...rest)
  } else if (arg === 'card') {
    await showCard(...rest)
  } else if (arg === 'quit' || arg === 'exit') {
    process.exit(0)
  } else {
    console.error(`usage: pnpm run patch [${options.join(' | ')}]`)
  }
}

async function patchStatus() {
  try {
    console.log('reading cards from fs...')
    const cards = await getCardsAsObject()
    let workon: Array<[string, Card]> = []
    let ready: Array<[string, Card]> = []
    for (const c of Object.entries(cards)) {
      if (c[1].text === c[1].textLastImplementedAsCode) {
        ready.push(c)
      } else {
        workon.push(c)
      }
    }
    console.log('==========================')
    console.log('Patch status:')
    console.log(
      `${ready.length} / ${ready.length + workon.length} cards ready.`
    )
    console.log(`${workon.length} cards to-do.`)
    const update = workon.reduce<{ [index: number]: string }>((obj, c) => {
      obj[c[0]] = c[1].name
      return obj
    }, {})

    if (Object.keys(update).length > 0) {
      console.log('Update: ')
      console.table(update)
    }

    if (workon.length === 0) {
      console.log(
        'No cards left. All card effects have been marked as current.'
      )
    }
  } catch (err) {
    console.error('Error!', err)
  }
}

async function markCard(...args: string[]) {
  try {
    const { sheets } = await getDesignDataAsObject()
    const logUsage = () =>
      console.log('pnpm run patch mark <id> [more ids] <(d)one | (u)pdate>')
    if (args.length < 2) {
      logUsage()
      return
    }
    const mode = args[args.length - 1]
    for (let idString of args.slice(0, args.length - 1)) {
      const id = Number.parseInt(idString)
      if (!(id in sheets.cards)) {
        console.log(`Card [${id}] doesn't need a code update.`)
        return
      }
      let card: Card
      switch (mode[0].toLowerCase()) {
        case 'd': // done
          card = sheets.cards[id]
          card.textLastImplementedAsCode = card.text
          // when you change a card's text, we need to invalidate translations for it.
          for (const lang of supportedLanguages) {
            try {
              const langFilePath = path.join(
                __dirname,
                `../../../lib/language-manager/locales/${lang}/cards.json`
              )
              const cardsLangData = JSON.parse(
                fs.readFileSync(langFilePath, 'utf-8')
              )
              if (id in cardsLangData) {
                delete cardsLangData[id].description
                fs.writeFileSync(
                  langFilePath,
                  JSON.stringify(cardsLangData, null, 2)
                )
              }
            } catch (err) {
              console.error('Error while invalidating text in lang', lang)
              throw err
            }
          }
          break
        case 'u': // update
          card = sheets.cards[id]
          card.textLastImplementedAsCode = '<update me>'
          break
        default:
          logUsage()
          return
      }
      console.log(
        `Marked [${id}] ${card.name} as ${
          card.textLastImplementedAsCode === card.text ? 'done' : 'update'
        }`
      )
      // write updated card
      const textLastImpldFile = path.join(
        sheetsFolderPath,
        `./cards/${id}/textLastImplementedAsCode`
      )
      fs.writeFileSync(
        textLastImpldFile,
        JSON.stringify(card.textLastImplementedAsCode, null, 2)
      )
    }
  } catch (err) {
    console.error(err)
  }
}

async function showCard(...args: string[]) {
  console.log(
    '================================================================'
  )
  const logUsage = () => console.log('pnpm run patch card [id]')
  const { sheets } = await getDesignDataAsObject()

  if (args.length !== 1) {
    logUsage()
    return
  }
  const id = Number.parseInt(args[0].trim())
  const card = sheets.cards[id]

  if (card.text === card.textLastImplementedAsCode) {
    console.warn(`Card [${id}] doesn't need any changes!`)
  }

  console.log(`../state/src/card_effects/c${id}.rs`)
  printCard([`${id}`, card])
}

function printCard(card: [string, Card]) {
  console.log(renderCard(card))
}

function renderCard([id, card]: [string, Card], title = ''): string {
  const cardWidth = 28
  return (
    (title !== '' ? cardText(title, ' ', ' ') : '') +
    cardText('_'.repeat(cardWidth), ' ', ' ') +
    cardText(' '.repeat(cardWidth), '/', '\\') +
    cardText(`(${id}) ${card.name}
${card.cost}c ${card.element} ${card.prism} ${card.type}

${card.type == 'unit' ? card.power + '/' + card.health : ''} ${card.traits}

${
  card.textLastImplementedAsCode !== card.text
    ? 'PREVIOUS TEXT: \n' +
      wrap(
        card.text?.length
          ? joinParsedDescription(
              getParsedCardDescription(
                card.textLastImplementedAsCode ?? '',
                id => `card ${id}`,
                i18n.t
              )
            )
          : 'NO TEXT',
        cardWidth
      )
    : ''
}
${
  (card.textLastImplementedAsCode !== card.text ? 'CURRENT TEXT: \n' : '') +
  wrap(
    card.text?.length
      ? joinParsedDescription(
          getParsedCardDescription(card.text, id => `card ${id}`, i18n.t)
        )
      : 'NO TEXT',
    cardWidth
  )
}`) +
    cardText('_'.repeat(cardWidth), '\\', '/')
  )

  function cardText(text: string, left = '|', right = '|'): string {
    return (
      text
        .split('\n')
        .map(line => {
          const width = Math.max(0, cardWidth - line.length)
          const padding = ' '.repeat(Math.floor(width / 2))
          return (
            left +
            padding +
            line +
            (width % 2 == 0 ? padding : padding + ' ') +
            right
          )
        })
        .join('\n') + '\n'
    )
  }
}

function wrap(string: string, width: number): string {
  return string.replace(
    new RegExp(`(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`, 'g'),
    '$1\n'
  )
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve =>
    rl.question(query, (ans: string) => {
      rl.close()
      resolve(ans)
    })
  )
}
