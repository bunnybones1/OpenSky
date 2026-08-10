//@ts-ignore
const fs = require('fs')
//@ts-ignore
const [, , filepath] = process.argv
const dataToProcess = JSON.parse(fs.readFileSync(filepath, 'utf-8').toString())

let charSet = []

function processBranch(node) {
  for (const key of Object.keys(node)) {
    const child = node[key]

    if (typeof child === 'string') {
      for (let i = 0; i < child.length; i++) {
        const char = child[i]
        //@ts-ignore
        if (!charSet.includes(char)) charSet.push(char)
      }
    } else {
      processBranch(child)
    }
  }
}

console.log('Okay! Starting...')
console.log('------------------------------')

processBranch(dataToProcess)

charSet.sort((a, b) => {
  if (a > b) {
    return 1
  }
  if (a < b) {
    return -1
  }
  return 0
})

const leadingFilepath = filepath.slice(undefined, filepath.lastIndexOf('/') + 1)
const filename = filepath.slice(filepath.lastIndexOf('/') + 1)

fs.writeFileSync(
  leadingFilepath + 'charset-' + filename,
  JSON.stringify(charSet, null, 2)
)

console.log('------------------------------')
console.log('Done!')
