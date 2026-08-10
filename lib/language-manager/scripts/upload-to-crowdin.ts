import path from 'node:path'
import CrowdIn from '@crowdin/crowdin-api-client'
import { readFileSync } from 'node:fs'
import { languageFileIDs, languageFiles } from '../src/languageFiles'

const SW_PROJECT_ID = 581637

async function main() {
  const ci = new CrowdIn({
    token: process.env.CROWDIN_BEARER_TOKEN ?? ''
  })
  await Promise.all(
    languageFiles('en')
      .map(f => path.join(...f))
      .map(async sourceFile => {
        const filename = path.basename(sourceFile)
        console.log(`${filename} uploading...`)
        const u = await ci.uploadStorageApi.addStorage(
          filename,
          readFileSync(sourceFile).toString(),
          'application/json'
        )
        console.log(`${filename} updating to newly uploaded version....`)
        const xx = await ci.sourceFilesApi.updateOrRestoreFile(
          SW_PROJECT_ID,
          languageFileIDs[filename],
          {
            updateOption: 'keep_translations',
            storageId: u.data.id
          }
        )
        console.log(
          `${xx.data.name} done, uploaded at ${xx.data.updatedAt}\n${'='.repeat(
            20
          )}`
        )
      })
  )
  console.log('all done')
}
main().catch(e => {
  console.error(
    'You must pass a bearer token as env variable `CROWDIN_BEARER_TOKEN`',
    e
  )
  process.exit(1)
})
