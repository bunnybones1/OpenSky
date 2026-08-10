import { writeFileSync } from 'fs'
import { rm, stat } from 'fs/promises'
import * as path from 'path'

import { assetsPath, cachePath } from '../config'
import { CommandBlockProcessor } from '../framework/Orchestrator'
import { globAsync, readFileAsync } from '../framework/utils'

interface FolderDef {
  folders: FolderDef[]
  files: string[]
}

export async function detectOrphanedAssets(
  _orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const resultsFile = await readFileAsync(
    path.join(cachePath, '/results.hashCache.json'),
    'utf8'
  )
  const rootFolder: FolderDef = JSON.parse(resultsFile)
  const results: Set<string> = new Set()
  const parseFolder = (folder: FolderDef, currPath = assetsPath) => {
    const { folders, files } = folder

    // Store current folder
    results.add(currPath)

    for (const [foldername, folder] of Object.entries(folders)) {
      parseFolder(folder, path.join(currPath, foldername))
    }
    for (const filename of Object.keys(files)) {
      results.add(path.join(currPath, filename))
    }
  }
  parseFolder(rootFolder)

  const outputRoots = ['scratch', 'webapp', 'game', 'metadata']
  const searchPath = path.join(assetsPath, `@(${outputRoots.join('|')})/**/*`)
  const assets = await globAsync(searchPath)
  const orphaned: Set<string> = new Set()

  for (const asset of assets) {
    if (!results.has(asset)) {
      orphaned.add(asset.replace(assetsPath + '/', ''))
    }
  }

  writeFileSync(
    path.join(cachePath, 'orphaned.json'),
    JSON.stringify(Array.from(orphaned), null, 2)
  )

  task.title += `: ${orphaned.size} orphaned assets found.`
}

export async function deleteOrphanedAssets(
  _orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const orphanedFilesList = await readFileAsync(
    path.join(cachePath, '/orphaned.json'),
    'utf8'
  )
  const orphans: string[] = JSON.parse(orphanedFilesList)
    .map((p) => path.resolve(assetsPath + '/' + p))
    .reverse()

  for (const orphan of orphans) {
    task.output = orphan
    const info = await stat(orphan)
    if (info.isFile()) {
      await rm(orphan)
    } else if (info.isDirectory()) {
      try {
        await rm(orphan, { recursive: true })
      } catch (e) {
        //
      }
    }
  }
}
