import { Storage } from '@google-cloud/storage'
import { FlatMatchData, processToCSV } from 'analyticsHelpers'
import { MatchData } from 'Match'
// uncomment for local testing
// import path from 'path'
// export const GOOGLE_APPLICATION_CREDENTIALS = path.join(
//   __dirname,
//   '../secrets/gcs_key.json'
// )

const storage = new Storage()
const bucketName = process.env.TARGET_BUCKET

// creates 3 CSV files with the MatchData (or error msg) and saves it to {bucket}/{path}
// Each match generates: General Match Data csv, Game State Data csv, Move Data csv
export async function uploadMatch(
  matchID: number,
  path: string,
  contents: MatchData | string
) {
  let attempts = 0
  while (attempts < 10) {
    attempts++
    try {
      if (typeof contents === 'string') {
        // the contents are an error as JSON
        await storage
          .bucket(bucketName)
          .file(`${path}errors/${matchID}.json`)
          .save(contents)
        console.log(`${matchID} uploaded error to ${bucketName}/${path}`)
      } else {
        let processedCSVs: FlatMatchData = processToCSV(contents)

        // upload the 3 CSV files
        await storage
          .bucket(bucketName)
          .file(`${path}match-data/${matchID}-match-data.csv`)
          .save(processedCSVs.generalMatchData)
        await storage
          .bucket(bucketName)
          .file(`${path}game-state-data/${matchID}-game-state-data.csv`)
          .save(processedCSVs.gameStateData)
        await storage
          .bucket(bucketName)
          .file(`${path}move-data/${matchID}-move-data.csv`)
          .save(processedCSVs.moveData)

        console.log(`${matchID} files uploaded to ${bucketName}/${path}`)
      }
      return
    } catch (error) {
      //gcs hiccup, probably network drop?
      console.log(error)
    }
  }
  throw Error('Unable to get matches in GCS after 10 attempts')
}
export async function getFilesInGCS(path: string, bucket: string) {
  // get files in bucket, return parsed data
  // attempt 10 times in case of network issues
  let attempts = 0
  while (attempts < 10) {
    attempts++
    try {
      const [files] = await storage.bucket(bucket).getFiles({ prefix: path })

      let matchFiles: any[] = []
      for (const file of files) {
        const downloadedFile = await file.download()
        const parsedFile = downloadedFile[0].toString('utf8')
        matchFiles.push(parsedFile)
      }

      return matchFiles
    } catch (error) {
      //gcs hiccup, probably network drop?
      console.log(error)
    }
  }
  throw Error('Unable to get files in GCS after 10 attempts')
}
