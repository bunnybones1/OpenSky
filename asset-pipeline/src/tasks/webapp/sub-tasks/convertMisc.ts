import * as path from 'path'

import { artPath, assetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { globAsync } from '~/framework/utils'
import { replaceOldFormatExt } from '~/tasks/helpers/replaceOldFormatExt'

export const convertMisc: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Copying webapp misc...'

  const files1 = await globAsync(path.join(artPath, 'webapp/misc/*'))
  const files2 = await globAsync(path.join(artPath, 'webapp/spritesheets/*'))
  const files = files1.concat(files2)

  await orchestrator.processCommandBlocks(
    files.map((file) => {
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
      task.output = `Converting webapp misc ... ${processed}/${total} (${skipped} skipped)`
    }
  )
}
