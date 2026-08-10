import { StickerLibrary } from '@opensky/shared/cosmetics'
import * as path from 'path'

import { artPath, webappAssetsPath } from '~/config'
import { STICKER_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'
import { replaceOldFormatExt } from '~/tasks/helpers/replaceOldFormatExt'

export async function convertAndResizeStickers(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artRankBadgesPath = path.resolve(artPath, 'stickers')
  const stickerFiles = [...new Set([...StickerLibrary.values()])].map(
    (sticker) => path.join(artRankBadgesPath, `${sticker.artID}.png`)
  )

  for (const [size, { width }] of Object.entries(STICKER_SIZES)) {
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `stickers/${size}`)
    )

    const prismCommandBlocks: CommandBlock[] = stickerFiles.map((file) => {
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(file.replace(artRankBadgesPath, dstDir))
      )

      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize ${width} -quality 75 -strip ${context.outputFile}`
      )
    })

    await orchestrator.processCommandBlocks(prismCommandBlocks)
  }
}
