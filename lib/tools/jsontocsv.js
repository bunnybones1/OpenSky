const path = require('path')
const fs = require('fs')
const csv = require('csv-parser')

if (process.argv.length !== 4) {
  console.error('Expected invocation: jsontocsv.js infile.json outfile.csv')
  process.exit(1)
}

const inPath = path.join(__dirname, process.argv[2])
const json = JSON.parse(fs.readFileSync(inPath, 'utf8').toString())
let output = ''
function traverse(jsonObj, keys = []) {
  if (jsonObj !== null && typeof jsonObj == 'object') {
    if (Array.isArray(jsonObj)) {
      jsonObj.forEach((item, i) => {
        traverse(item, [...keys, `__ARR__${i}`])
      })
    } else {
      Object.entries(jsonObj).forEach(([key, value]) => {
        traverse(value, [...keys, key])
      })
    }
  } else {
    output += `"${keys.join('.')}","${jsonObj}"\n`
  }
}

traverse(json)

const outputPath = path.join(__dirname, process.argv[3])
fs.writeFileSync(outputPath, output)
