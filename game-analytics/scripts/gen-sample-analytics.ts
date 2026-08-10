import * as path from 'path'
import * as fs from 'fs'
import { SkyWeaverAPI } from '@opensky/proto'
import { Game } from 'Match'
import { saveCSVFiles, processToCSV } from 'analyticsHelpers'
const jwtPath = path.join(__dirname, '../secrets/jwt.json')
let jwt: string
try {
  jwt = JSON.parse(fs.readFileSync(jwtPath).toString()).key
} catch {
  throw new Error(`Failed to read json jwt. Put your jwt in ${jwtPath}`)
}
const apiURL = 'https://api.skyweaver.net'
const api = new SkyWeaverAPI(apiURL, (req, init) =>
  fetch(req, {
    ...init,
    headers: { ...init.headers, Authorization: `BEARER ${jwt}` }
  })
)

async function main() {
  const matchID = Number.parseInt(process.argv[2])
  const replayData = await api
    .getMatch({
      matchID
    })
    .then(r => r.match)
    .catch(r => {
      console.log(r)
    })
  if (!replayData) {
    console.log('Failed to get replayID, aborting...')
    return
  }
  const record = await api.getMatchArchiveRecordsURI({
    matchID,
    replayID: replayData.replayID
  })

  console.log('Generating match analytics for match: ', matchID)
  try {
    const matchLogs = await Promise.all(
      record.recordURIs.map(r => fetch(r).then(r => r.text()))
    )
    const gameMatchData = await Game.loadMatch(matchID, matchLogs)
    if (gameMatchData.type === 'matchData') {
      let processedCSVs = processToCSV(gameMatchData)
      saveCSVFiles(processedCSVs)
    } else {
      if (
        typeof gameMatchData.err === 'string' &&
        gameMatchData.err.includes('data[..size] != *version')
      ) {
        console.log('Replay version miss-match, skipping...')
      } else {
        console.error(
          `Error in match ${matchID}. Removing it from queue...\n`,
          gameMatchData.err
        )
      }
    }
  } catch (err) {
    console.log(err)
  }
}
main()
