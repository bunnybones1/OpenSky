import path from 'node:path'
import fs from 'node:fs'
import CrowdIn from '@crowdin/crowdin-api-client'
import { supportedLanguages, languageFiles, i18nInit, i18n } from '../src'
import { sortedStringify } from '../../shared/src/utils/sort-keys'
import {
  getParsedCardDescription,
  joinParsedDescription
} from '../../parse-card-description'
import StreamZip from 'node-stream-zip'
import temp from 'temp'
import { finished } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { languageFileIDs } from '../src/languageFiles'
import { pigLatinifyObject } from './pigLatinify'

const SW_PROJECT_ID = 581637

async function main() {
  const ci = new CrowdIn({
    token: process.env.CROWDIN_BEARER_TOKEN ?? ''
  })
  const en = languageFiles('en').map(f => path.join(...f))

  console.log('Building project for languages', supportedLanguages)

  const build = await ci.translationsApi.buildProject(SW_PROJECT_ID, {
    skipUntranslatedStrings: true,
    exportApprovedOnly: true
  })

  while (true) {
    const { data } = await ci.translationsApi.checkBuildStatus(
      SW_PROJECT_ID,
      build.data.id
    )
    if (data.status === 'canceled' || data.status === 'failed') {
      throw new Error(`Failed to build languages.`)
    } else if (data.status === 'finished') {
      console.log('All languages built!')
      break
    } else if (data.status === 'created' || data.status === 'inProgress') {
      console.log('Building...', data.progress, '%')
      await new Promise(r => setTimeout(r, 100))
    } else {
      const x: never = data.status
      throw new Error(`Invalid status ${x}`)
    }
  }
  console.log('Downloading translations...')

  const download = await ci.translationsApi.downloadTranslations(
    SW_PROJECT_ID,
    build.data.id
  )

  const zipTempPath = temp.path({ suffix: '.zip' })
  const stream = fs.createWriteStream(zipTempPath)
  const { body } = await fetch(download.data.url)
  if (!body) {
    throw new Error('No body on fetch!')
  }
  await finished(Readable.fromWeb(body as any).pipe(stream))

  const zip = new StreamZip.async({
    file: zipTempPath
  })

  for (const lang of supportedLanguages.filter(
    l =>
      l !== 'en' &&
      l !== 'pig' &&
      /** TODO : remove zh filter when we add it!**/ l !== 'zh'
  )) {
    const filepaths = languageFiles(lang)
      .map(f => path.join(...f))
      .map((l, i) => ({
        en: path.basename(en[i]),
        dir: path.dirname(l),
        l
      }))

    for (const filename of Object.keys(languageFileIDs)) {
      const filepath = filepaths.find(f => f.en === filename)
      if (!filepath) {
        throw new Error(`Unexpected filename ${filename}.`)
      }
      const translatedFile = await zip.entryData(`${lang}/${filename}`)
      fs.mkdirSync(filepath.dir, {
        recursive: true
      })

      const translations = JSON.parse(translatedFile.toString())
      const fixedTranslations =
        removeKeysWhereValuesAreEmptyStringsRecursively(translations)
      fs.writeFileSync(filepath.l, sortedStringify(fixedTranslations, 2))
      console.log(`wrote translations to ${filepath.l}`)
    }

    const it = i18n.createInstance()
    const t = await i18nInit(
      {
        lng: lang,
        defaultNS: 'translation',
        version: '',
        parseMissingKeyHandler: (key, defaultVal) => {
          if (defaultVal !== undefined) {
            return defaultVal
          }
          throw new Error(
            `Tried to get translation for non-existing key ${key}`
          )
        }
      },
      it
    )

    const allTranslatedCardIDs = Object.keys(it.store.data[lang].cards)

    for (const card of allTranslatedCardIDs) {
      const d = getParsedCardDescription(
        t(`cards:${`${card}`}.description`),
        x => t(`cards:${`${x}`}.name`),
        t
      )
      const j = joinParsedDescription(d)
      void j
      // if we made it here, syntax is OK.
    }
    console.log('all syntax OK for', lang)
  }
  await zip.close()
  console.log('downloaded langs done.')
  console.log('pig latinifying EN...')
  generatePigLatinTranslations()
  console.log('all done!')
  process.exit(0)
}

main().catch(e => {
  console.error(
    'You must pass a bearer token as env variable `CROWDIN_BEARER_TOKEN`\n',
    e
  )
  process.exit(1)
})

function removeKeysWhereValuesAreEmptyStringsRecursively(obj: object) {
  return Object.keys(obj)
    .filter(k => obj[k] !== '')
    .reduce((acc, k) => {
      const val = obj[k]
      acc[k] =
        typeof val === 'object'
          ? removeKeysWhereValuesAreEmptyStringsRecursively(val)
          : val
      return acc
    }, {})
}

function generatePigLatinTranslations() {
  const files = languageFiles('en')
    .map(p => path.join(...p))
    .map(p => ({
      id: path.basename(p, '.json'),
      enPath: p,
      pigPath: p.replace('/en/', '/pig/').replace('\\en\\', '\\pig\\')
    }))

  for (const file of files) {
    console.log('Okay! Starting... ' + JSON.stringify(file, null, 2))
    console.log('------------------------------')

    const gameVocab = JSON.parse(
      fs.readFileSync(file.enPath, 'utf8').toString()
    )

    pigLatinifyObject(gameVocab, file.id === 'cards')

    fs.writeFileSync(file.pigPath, sortedStringify(gameVocab, 2))

    console.log('------------------------------')
    console.log('Done!')
  }
}
