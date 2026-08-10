import { languageFiles } from '../src/languageFiles'
import path from 'node:path'
import fs from 'node:fs'
import { supportedLanguages } from '../src/index'

for (const lang of supportedLanguages) {
  let chars = 0
  let words = 0
  const uniqueChars = new Set()
  const uniqueWords = new Set()

  languageFiles(lang)
    .map(f => path.join(...f))
    .forEach(p => {
      const langFileContents = fs.readFileSync(p, 'utf8').toString()
      console.log(p)
      return traverse(JSON.parse(langFileContents))
    })

  console.log(
    `${lang} ||||| total words: ${words}, total chars: ${chars}, unique words: ${uniqueWords.size}, unique chars: ${uniqueChars.size}`
  )

  function traverse(o: object) {
    for (const i of Object.keys(o)) {
      const key = i as any
      if (!!o[key] && typeof o[key] == 'object') {
        if (Array.isArray(o[key])) {
          for (const item of o[key] as Array<any>) {
            traverse(item)
          }
        } else {
          traverse(o[key])
        }
      } else if (typeof o[key] == 'string') {
        const wordsHere = o[key].split(' ')
        words += wordsHere.length
        chars += o[key].length
        for (const word of wordsHere) {
          uniqueWords.add(word)
          for (const char of word) {
            uniqueChars.add(char)
          }
        }
      } else {
        console.error('invalid thing ', o, key, o[key])
      }
    }
  }
}
