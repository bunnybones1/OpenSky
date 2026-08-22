import { writeFileSync } from 'fs'

import { FlatMatchData } from './analyticsHelpers'

export function saveCSVFiles(matchCSVData: FlatMatchData) {
  try {
    writeFileSync('./match-data.csv', matchCSVData.generalMatchData)
    writeFileSync('./game-state-data.csv', matchCSVData.gameStateData)
    writeFileSync('./move-data.csv', matchCSVData.moveData)
  } catch (err) {
    console.error(err)
  }
}
