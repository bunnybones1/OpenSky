import * as functions from '@google-cloud/functions-framework'
import { MessagePublishedData } from '@google/events/cloud/pubsub/v1/MessagePublishedData'
import { getFilesInGCS, uploadMatch } from './googleCloudStorage'
import { Game } from './Match'
import { PubsubMessage } from '@google-cloud/pubsub/build/src/publisher'
import { PubSub } from '@google-cloud/pubsub'

// Register a CloudEvent callback with the Functions Framework that will
// be triggered by Cloud Storage.
const pubSubClient = new PubSub({
  projectId: `${process.env.GCP_PROJECT_ENV_ID}`
})
const targetEnv = `opensky-match-logs-${process.env.GAME_ENV_NAME}` //dev2

// this fn will check for a completed replay before publishing message
//      - match is finished when a 'rewards' message type is sent
//      - use source of finsihed match diff log to pull the init diff log
//      - use init log to get version, then send everything to be processed in next fn
const getVersionAndIDFromReplay = async (
  cloudEvent: functions.CloudEvent<MessagePublishedData>
) => {
  console.log('Got a new replay file, processing...')
  const file: Array<string> = await getFilesInGCS(
    cloudEvent.name as string,
    targetEnv
  )
  console.log('Got a file: ', file)
  if (!file || file.length === 0) {
    console.log('File or file message is bad, aborting. ', file)
    return
  }
  const data = JSON.parse(file[0])
  const logSource = cloudEvent.name as string

  //data will be a difflog, an array of objects
  if (!data) {
    console.log('Data is bad, aborting: ', data)
    return
  }
  // const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('ascii'))
  //we want to find the last difflog for the match, which ends in a reward message type:
  for (const diff of data) {
    if (diff.message && diff.message.type && diff.message.type === 'rewards') {
      // example source: 'release/match/archive/3000200/0001.json`'
      const s = logSource.split(`${process.env.GAME_ENV_NAME}/match/archive/`)
      const matchID = s[s.length - 1].split('/')[0]
      const replaySource = `${process.env.GAME_ENV_NAME}/match/archive/${matchID}/`

      const records: Array<string> = await getFilesInGCS(
        replaySource,
        targetEnv
      )
      console.log('source: ', replaySource)
      console.log('records: ', records)
      for (const record of records) {
        const maybeInitLog = JSON.parse(record)
        console.log('maybeInitLog: ', maybeInitLog)
        for (const diff of maybeInitLog) {
          if (diff.version) {
            const version = diff.version
            console.log('Pushing replay data to pubMatchData: ', {
              matchID,
              replay_source: replaySource
            })
            publishMessage(
              JSON.stringify({ matchID, replaySource }),
              `match-${version}`
            )
            return
          }
        }
      }
      console.log('Could not upload match data, found no Init Log...')
    }
  }
}

// Function listens to a pub for a specific prod deploy version, and uses that state/wasmbindgen version to process replay
// Uploades processed replay into destination folder
// When we do a prod deploy, we need to copy:
// ../state/js-bindings/bundle/node/bindings_bg.wasm  -> ./build/game-analytics/src/
// Will be deployed to listen to pubsub topic `//pubsub.googleapis.com/projects/game-analytics/topics/${process.env.GITCOMMIT}`
const pubMatchData = async (cloudEvent: PubsubMessage) => {
  console.log('Got Match Data...', cloudEvent)
  const file = cloudEvent
  if (!file || !file.data) {
    console.error(`CloudEvent or its data field is undefined: `, file)
    return
  }
  const data = file.data as string

  if (!data) {
    console.error(`Message data is undefined.`)
    return
  }
  console.log('decoded data: ', atob(data))
  const decodedData = JSON.parse(atob(data)) // get version from data

  if (decodedData.matchID && decodedData.replaySource) {
    const matchID = decodedData.matchID
    const record: Array<string> = await getFilesInGCS(
      decodedData.replaySource,
      targetEnv
    ) //this will be the replay diff logs

    // try to load it and add it
    console.log('adding match', matchID)
    try {
      const gameMatchData = await Game.loadMatch(matchID, record)
      console.log('Finished generating match data...')
      if (gameMatchData.type === 'matchData') {
        // uploade matchData to GCS
        await uploadMatch(
          matchID,
          process.env.OPTIONAL_TARGET_PATH ?? '',
          gameMatchData
        )
      } else {
        if (
          typeof gameMatchData.err === 'string' &&
          gameMatchData.err.includes('data[..size] != *version')
        ) {
          console.log('Replay version miss-match, skipping...')
        } else {
          // send error with matchID to GCS for sake of continuity and diagnostics
          await uploadMatch(
            matchID,
            process.env.OPTIONAL_TARGET_PATH ?? '',
            JSON.stringify({ error: gameMatchData.err.toString() }, null, 2)
          )
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
}

async function publishMessage(data: any, topicNameOrId: string) {
  // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
  const dataBuffer = Buffer.from(data, 'utf-8')

  try {
    const messageId = await pubSubClient
      .topic(topicNameOrId)
      .publishMessage({ data: dataBuffer })
    console.log(`Message ${messageId} published to Topic ${topicNameOrId}.`)
  } catch (error) {
    console.error(
      `Received error while publishing: ${error.message} to Topic ${topicNameOrId}.`
    )
    process.exitCode = 1
  }
}
export { getVersionAndIDFromReplay, pubMatchData }
