import * as path from 'path'

import { artPath, webappAssetsPath } from '~/config'
import { SPELL_ART_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder, globAsync } from '~/framework/utils'

export const convertAndResizeSpellArt: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const artSpellPath = path.resolve(artPath, 'cards/art-full/spells')
  const files = await globAsync(path.resolve(artSpellPath, '*.png'))

  for (const [size, { width, height }] of Object.entries(SPELL_ART_SIZES)) {
    const resizeCommandBlocks: CommandBlock[] = []
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `/spell-art/${size}`)
    )

    files.forEach((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(artSpellPath, dstDir).replace('.png', `@${size}.webp`)
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
