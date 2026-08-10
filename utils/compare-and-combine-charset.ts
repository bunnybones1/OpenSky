//@ts-ignore
const fs = require('fs')
//@ts-ignore
const [, , filepath1, filepath2] = process.argv
const data1 = JSON.parse(fs.readFileSync(filepath1, 'utf-8').toString())
const data2 = JSON.parse(fs.readFileSync(filepath2, 'utf-8').toString())

let combinedCharSet = data1

/* Helpful Command Example (copy and paste the following while in "OpenSky/utils"):

node grab-charset.ts ../lib/language-manager/src/language/cards-en.json &&
node grab-charset.ts ../lib/language-manager/src/language/vocab-en.json &&
node compare-and-combine-charset.ts ../lib/language-manager/src/language/charset-vocab-en.json ../lib/language-manager/src/language/charset-cards-en.json &&
node grab-charset.ts ../lib/language-manager/src/language/cards-es.json &&
node grab-charset.ts ../lib/language-manager/src/language/vocab-es.json &&
node compare-and-combine-charset.ts ../lib/language-manager/src/language/charset-vocab-es.json ../lib/language-manager/src/language/charset-cards-es.json &&
node grab-charset.ts ../lib/language-manager/src/language/cards-fr.json &&
node grab-charset.ts ../lib/language-manager/src/language/vocab-fr.json &&
node compare-and-combine-charset.ts ../lib/language-manager/src/language/charset-vocab-fr.json ../lib/language-manager/src/language/charset-cards-fr.json &&
node grab-charset.ts ../lib/language-manager/src/language/cards-pt.json &&
node grab-charset.ts ../lib/language-manager/src/language/vocab-pt.json &&
node compare-and-combine-charset.ts ../lib/language-manager/src/language/charset-vocab-pt.json ../lib/language-manager/src/language/charset-cards-pt.json*/

function processesBranch(node) {
  for (const key of Object.keys(node)) {
    const child = node[key]

    if (typeof child === 'string') {
      //@ts-ignore
      if (!combinedCharSet.includes(child)) combinedCharSet.push(child)
    } else {
      processesBranch(child)
    }
  }
}

console.log('Okay! Starting...')
console.log('------------------------------')

processesBranch(data2)

combinedCharSet.sort((a, b) => {
  if (a > b) {
    return 1
  }
  if (a < b) {
    return -1
  }
  return 0
})

const leadingFilepath1 = filepath1.slice(
  undefined,
  filepath1.lastIndexOf('/') + 1
)
const filename1 = filepath1.slice(filepath1.lastIndexOf('/') + 1)
const filename2 = filepath2.slice(filepath2.lastIndexOf('/') + 1)
const suffix = filepath2.slice(
  filepath2.lastIndexOf('-') + 1,
  filepath2.lastIndexOf('.') + 1
)
// const fileEnding = suffix.slice(suffix.lastIndexOf('.') + 1)

console.log(suffix)

// console.log(combinedCharSet)
let output = ''
for (const char of combinedCharSet) {
  output = output + char
}
// console.log(output.toString())

fs.writeFileSync(leadingFilepath1 + 'charset-' + suffix + 'text', output)

console.log('------------------------------')
console.log('Done!')
