import { getDesignDataAsObject } from '@opensky/design-data/scripts/data'
import fs from 'fs'
import * as path from 'path'

if (
  !fs.existsSync(process.argv[2]) ||
  !fs.lstatSync(process.argv[2]).isDirectory()
) {
  console.warn('Error: Invalid or missing destination directory given.')
  process.exit(0)
}
const baseFolder = path.join(__dirname, '..', '..')
const unitArtPath = path.join(
  baseFolder,
  '../OpenSky-asset-masters/cards/art-full/units'
)
const spellsArtPath = path.join(
  baseFolder,
  '../OpenSky-asset-masters/cards/art-full/spells'
)

const designData = await getDesignDataAsObject()

fs.mkdirSync(path.join(process.argv[2], '/units'), { recursive: true })
fs.mkdirSync(path.join(process.argv[2], '/spells'), { recursive: true })
for (const [cardID, card] of Object.entries(designData.sheets.cards)) {
  let pathType: string
  let destinationPath: string
  if (card.artSlug.startsWith('unit')) {
    pathType = unitArtPath
    destinationPath = path.join(process.argv[2], 'units')
  } else {
    pathType = spellsArtPath
    destinationPath = path.join(process.argv[2], '/spells')
  }
  fs.copyFile(
    path.join(pathType, `/${card.artSlug}.png`),
    `${destinationPath}/${cardID}.png`,
    (err) => {
      if (err) {
        throw err
      }
    }
  )
}
