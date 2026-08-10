import * as path from 'path'

import { artPath, assetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { globAsync } from '~/framework/utils'
import { replaceOldFormatExt } from '~/tasks/helpers/replaceOldFormatExt'

export const convertBackgrounds: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Copying webapp backgrounds...'

  const files = await globAsync(path.join(artPath, 'webapp/backgrounds/*'))

  await orchestrator.processCommandBlocks(
    files.map((file) => {
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(file.replace(artPath, assetsPath))
      )
      return new CommandBlock(
        context,
        context.inputFile.includes('.mp4')
          ? `cp ${context.inputFile} ${context.outputFile}`
          : `magick convert ${context.inputFile} -quality 90 -strip ${context.outputFile}`
      )
    }),
    (processed, skipped, total) => {
      task.output = `Converting webapp backgrounds ... ${processed}/${total} (${skipped} skipped)`
    }
  )

  const elementBgs = await globAsync(path.join(artPath, 'cards/art-full/bgs/*'))

  await orchestrator.processCommandBlocks(
    elementBgs.map((file) => {
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(
          file.replace(
            path.dirname(file),
            path.join(assetsPath, 'webapp/backgrounds')
          )
        )
      )

      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -quality 90 -strip ${context.outputFile}`
      )
    }),
    (processed, skipped, total) => {
      task.output = `Converting webapp element backgrounds ... ${processed}/${total} (${skipped} skipped)`
    }
  )
}
