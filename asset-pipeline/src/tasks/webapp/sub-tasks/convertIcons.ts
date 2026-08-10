import * as path from 'path'

import { artPath, assetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder, globAsync } from '~/framework/utils'
import { replaceOldFormatExt } from '~/tasks/helpers/replaceOldFormatExt'

export const convertIcons: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Copying webapp icons...'

  const iconFiles = await globAsync(path.join(artPath, 'webapp/icons/*'))

  await orchestrator.processCommandBlocks(
    iconFiles.map((file) => {
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(file.replace(artPath, assetsPath))
      )
      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -quality 75 -strip ${context.outputFile}`
      )
    }),
    (processed, skipped, total) => {
      task.output = `Converting webapp icons ... ${processed}/${total} (${skipped} skipped)`
    }
  )

  const artRankBadgesPath = path.resolve(artPath, 'rank-badges')
  const rankFiles = await globAsync(path.join(artRankBadgesPath, '*.png'))

  const dstDir = await ensureFolder(path.join(assetsPath, `webapp/icons`))

  const rankCommandBlocks: CommandBlock[] = rankFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      replaceOldFormatExt(file.replace(artRankBadgesPath, dstDir))
    )

    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize 96x96\\! -quality 90 -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    rankCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Compressing rank badge icons... : ${processed}/${total} (${skipped} skipped)`
    }
  )

  const artPrismsPath = path.resolve(artPath, 'prisms')

  const prismFiles = await globAsync(path.join(artPrismsPath, '*.png'))

  const dstDirLarge = await ensureFolder(
    path.join(assetsPath, `webapp/icons/prisms/large`)
  )
  const dstDirSmall = await ensureFolder(
    path.join(assetsPath, `webapp/icons/prisms/small`)
  )

  for (const pair of [
    [128, dstDirLarge],
    [64, dstDirSmall]
  ] as const) {
    const prismCommandBlocks: CommandBlock[] = prismFiles.map((file) => {
      const res = pair[0]
      const dstDir = pair[1]
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(file.replace(artPrismsPath, dstDir))
      )

      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize ${res}x${res}\\! -quality 90 -strip ${context.outputFile}`
      )
    })

    await orchestrator.processCommandBlocks(
      prismCommandBlocks,
      (processed, skipped, total) => {
        task.output = `Compressing prism icons... : ${processed}/${total} (${skipped} skipped)`
      }
    )
  }
}
