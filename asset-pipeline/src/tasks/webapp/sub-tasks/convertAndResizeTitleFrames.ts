import * as path from 'path'

import { scratchAssetsPath, webappAssetsPath } from '~/config'
import { TITLE_FRAME_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder, globAsync } from '~/framework/utils'

export const convertAndResizeTitleFrames: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Creating title frames...'
  const scratchTitlesPath = await ensureFolder(
    path.join(scratchAssetsPath, 'titles')
  )

  const files = await globAsync(path.join(scratchTitlesPath, '*.png'))

  // Resize and optimize title frames
  for (const [size, { width }] of Object.entries(TITLE_FRAME_SIZES)) {
    const resizeCommandBlocks: CommandBlock[] = []
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `titles/@${size}`)
    )

    files.forEach((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(scratchTitlesPath, dstDir).replace('.png', `@${size}.webp`)
      )
      resizeCommandBlocks.push(
        new CommandBlock(
          context,
          `magick convert ${context.inputFile} -resize ${width} -quality 75 -strip ${context.outputFile}`
        )
      )
    })

    await orchestrator.processCommandBlocks(resizeCommandBlocks)
  }
}
