import path from 'node:path'
import fs, { readFileSync } from 'node:fs'
import CrowdIn from '@crowdin/crowdin-api-client'
import { supportedLanguages, languageFiles } from '../src'
import { sortedStringify } from '../../shared/src/utils/sort-keys'
import StreamZip from 'node-stream-zip'
import temp from 'temp'
import { finished } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { languageFileIDs } from '../src/languageFiles'

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
    l => l !== 'en' && l !== 'pig'
  )) {
    console.log('Language', lang)
    const filepaths = languageFiles(lang)
      .map(f => path.join(...f))
      .map((l, i) => ({
        en: en[i],
        dir: path.join(__dirname, '../untranslated', lang),
        untranslated: path.join(
          __dirname,
          '../untranslated',
          lang,
          path.basename(l)
        )
      }))
    for (const filename of Object.keys(languageFileIDs)) {
      const filepath = filepaths.find(f => path.basename(f.en) === filename)
      if (!filepath) {
        throw new Error(`Unexpected filename ${filename}.`)
      }
      const translatedFile = await zip.entryData(`${lang}/${filename}`)
      const englishFile = readFileSync(filepath.en)

      const english = JSON.parse(englishFile.toString())
      const translations = JSON.parse(translatedFile.toString())
      const fixedTranslations =
        removeKeysWhereValuesAreEmptyStringsRecursively(translations)

      // Iterate recursively through the English file.
      // For every node we reach,
      // if this is a leaf node, and there is a value in fixedTranslations at the same path,
      // delete that leaf node.

      removeTranslatedStringsRecursively(english, undefined, fixedTranslations)

      const strippedEnglish = removeKeysWhereValuesAreEmptyObjectsRecursively(
        removeKeysWhereValuesAreEmptyStringsRecursively(english)
      )

      fs.mkdirSync(filepath.dir, { recursive: true })
      fs.writeFileSync(
        filepath.untranslated,
        sortedStringify(strippedEnglish, 2)
      )
      console.log(`wrote untranslated list to ${filepath.untranslated}`)
    }
  }
  await zip.close()
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

function removeTranslatedStringsRecursively(
  obj: object,
  path: string[] = [],
  referenceObject: object
) {
  if (typeof obj !== 'object') {
    return
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (typeof val !== 'object') {
      const translatedValue = path.reduce((acc, k) => acc[k], referenceObject)[
        key
      ]

      if (translatedValue) {
        delete obj[key]
      }
    } else {
      removeTranslatedStringsRecursively(val, path.concat(key), referenceObject)
    }
  }
}

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

function removeKeysWhereValuesAreEmptyObjectsRecursively(obj: object): object {
  Object.entries(obj).forEach(([k, v]) => {
    if (v && typeof v === 'object') {
      removeKeysWhereValuesAreEmptyObjectsRecursively(v)
    }
    if (
      (v && typeof v === 'object' && !Object.keys(v).length) ||
      v === null ||
      v === undefined
    ) {
      delete obj[k]
    }
  })
  return obj
}
