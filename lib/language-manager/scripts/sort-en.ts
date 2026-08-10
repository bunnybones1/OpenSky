import * as fs from 'fs'
import * as path from 'path'
import { sortedStringify } from '../../shared/src/utils/sort-keys'

const baseFolder = path.join(__dirname, '..', '..', '..')
const languageFolder = path.join(baseFolder, 'webapp/locales')
const enJSONPath = path.join(languageFolder, 'en/webapp.json')

console.log('Okay! Starting...')
console.log('------------------------------')

const gameVocab = JSON.parse(fs.readFileSync(enJSONPath, 'utf8').toString())
fs.writeFileSync(enJSONPath, sortedStringify(gameVocab, 2))

console.log('------------------------------')
console.log('Done!')

const gameLangFolder = path.join(
  baseFolder,
  'lib/language-manager/src/language'
)

const files = ['cardMeta', 'common', 'vocab', 'cards'] as const
for (const file of files) {
  const enJSONPath = path.join(gameLangFolder, `en/${file}.json`)

  console.log('Okay! Starting... ' + file)
  console.log('------------------------------')

  const gameVocab = JSON.parse(fs.readFileSync(enJSONPath, 'utf8').toString())

  fs.writeFileSync(enJSONPath, sortedStringify(gameVocab, 2))

  console.log('------------------------------')
  console.log('Done!')
}
