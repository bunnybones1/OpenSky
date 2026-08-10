const path = require('path')
const fs = require('fs')
const csv = require('csv-parser')

if (process.argv.length !== 4) {
  console.error('Expected invocation: csvtojson.js infile.csv outfile.json')
  process.exit(1)
}

const inPath = path.join(__dirname, process.argv[2])

const results = {}
fs.createReadStream(inPath)
  .pipe(csv({ headers: ['key', 'value'] }))
  .on('data', ({ key, value }) => {
    let obj = results
    const splitKeys = key.split('.')
    for (let i = 0; i < splitKeys.length; i++) {
      const key = splitKeys[i]
      if (i === splitKeys.length - 1) {
        if (Array.isArray(obj)) {
          obj[Number.parseInt(key.replace('__ARR__', ''))] = value
        }
        obj[key] = value
      } else {
        if (!obj.hasOwnProperty(key)) {
          obj[key] = splitKeys[i + 1].includes('__ARR__') ? [] : {}
        }
        obj = obj[key]
      }
    }
  })
  .on('end', () => {
    const outputPath = path.join(__dirname, process.argv[3])
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  })
