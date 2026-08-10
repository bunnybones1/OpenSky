import * as path from 'path'

import { artPath, webappAssetsPath } from '~/config'
import { UNIT_ART_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder, globAsync } from '~/framework/utils'

export const convertAndResizeUnitArt: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const artUnitPath = path.resolve(artPath, 'cards/art-full/units')
  const files = await globAsync(path.resolve(artUnitPath, '*.png'))

  // Resize and optimize unit art
  for (const [size, { width, height }] of Object.entries(UNIT_ART_SIZES)) {
    const resizeCommandBlocks: CommandBlock[] = []
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `/unit-art/${size}`)
    )

    files.forEach((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(artUnitPath, dstDir).replace('.png', `@${size}.webp`)
      )
      resizeCommandBlocks.push(
        new CommandBlock(
          context,
          `magick convert ${context.inputFile} -resize ${width}x${height}\\! -quality 75 -strip ${context.outputFile}`
        )
      )
    })

    await orchestrator.processCommandBlocks(resizeCommandBlocks)
  }
}
