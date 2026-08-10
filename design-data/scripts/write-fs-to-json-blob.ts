import { getDesignDataAsObject } from './data'
import { designDataFolderPath } from './dataLocations'

const { writeFile } = require('node:fs/promises')
const path = require('node:path')

/**
 * This script should be run whenever **anything** in the data folder changes.
 * It reads the contents of the data folder recursively,
 * and dumps a JSON file **next to** the data.
 */
async function main() {
  const jsonFilePath = path.join(designDataFolderPath, 'data.json')
  const json = await getDesignDataAsObject()
  await writeFile(jsonFilePath, JSON.stringify(json, null, 2), 'utf8')
}
main()
