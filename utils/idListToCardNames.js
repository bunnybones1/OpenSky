const fs = require('fs')
const path = require('path')

// Get numbers from command line arguments (excluding the first two default entries)
const numbers = process.argv.slice(2)

numbers.forEach(number => {
  let baseId = number
  let grade = 'base'
  if (baseId > 131072) {
    grade = 'gold'
    baseId -= 131072
  }
  // Construct the file path using the given template
  const cardPath = path.join('design-data/raw/sheets/cards', String(baseId))
  const nameFilePath = path.join(cardPath, 'name')
  const setFilePath = path.join(cardPath, 'set')

  // Read the file content
  const name = fs.readFileSync(nameFilePath, 'utf8')
  const set = fs.readFileSync(setFilePath, 'utf8')
  // Log the content of the file
  console.log(`${number}:`, grade, baseId, name, set)
})
