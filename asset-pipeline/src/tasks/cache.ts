import { exists } from 'fs'
import * as path from 'path'
import { promisify } from 'util'

import { assetsPath, skyWeaverPath } from '../config'
import CommandBlock from '../framework/CommandBlock'
import Folder from '../framework/Folder'
import { warn } from '../framework/logging'
import { CommandBlockProcessor } from '../framework/Orchestrator'

const existsAsync = promisify(exists)

export async function pruneMissingFiles(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  for (const folder of [
    orchestrator.commandHashCache,
    orchestrator.resultHashCache
  ]) {
    let missing = 0

    await folder.scan(async (folder, filePath) => {
      const fullFilePath = path.resolve(assetsPath, filePath)
      if (!(await existsAsync(fullFilePath))) {
        warn(`pruning ${filePath} (${fullFilePath})`, 6)
        missing++
        folder.removeHash(filePath)
        task.output = `Pruned ${missing} missing files`
      }
    })
  }

  await orchestrator.saveProgress()
}

export async function detectRemovedCommandOutputs(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const blocks: CommandBlock[] = []
  const fakeOrch: CommandBlockProcessor = {
    commandHashCache: new Folder(''),
    resultHashCache: new Folder(''),
    async saveProgress() {
      //
    },

    processCommandBlocks(commandBlocks) {
      blocks.push(...commandBlocks)
    },
    tasks: new Map()
  }
  for (const [name, t] of orchestrator.tasks.entries()) {
    if (name.includes('cache') || name.includes('orphaned')) {
      continue
    }
    if (t) {
      task.output = `Scanned ${blocks.length} command blocks, now scanning ${name}`
      await t(fakeOrch, {
        output: '',
        title: ''
      })
    }
  }
  task.output = `Scanned ${blocks.length} command blocks, finding output hashes...`

  const allOutputFilePaths = blocks.reduce<string[]>((paths, block) => {
    paths.push(
      ...block.context.outputFiles.map((p) =>
        path.resolve(skyWeaverPath, p.replace(`..${path.sep}..`, '..'))
      )
    )
    return paths
  }, [])
  let checked = 0
  let extraHashes = 0
  for (const folder of [
    orchestrator.commandHashCache,
    orchestrator.resultHashCache
  ]) {
    await folder.scan((folder, filePath) => {
      const fullFilePath = path.resolve(assetsPath, filePath)
      checked++
      if (!allOutputFilePaths.includes(fullFilePath)) {
        warn(`pruning ${filePath} (${fullFilePath})`, 6)
        extraHashes++
        folder.removeHash(filePath)
      }
      task.output = `Pruned ${extraHashes} missing hashes, checked ${checked}`
      return Promise.resolve()
    })
  }

  await orchestrator.saveProgress()
}
