import { CardBackLibrary } from '@opensky/shared/cosmetics'
import * as path from 'path'

import { artPath, webappAssetsPath } from '~/config'
import { CARD_BACK_SIZES, FULL_CARD_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'
import { replaceOldFormatExt } from '~/tasks/helpers/replaceOldFormatExt'

export async function convertAndResizePremiumCardBacks(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const cardBacksPath = path.resolve(artPath, 'card-backs-premium')
  const cardBackFiles = [...new Set([...CardBackLibrary.values()])].map(
    (cardBack) => path.join(cardBacksPath, `${cardBack.artID}.png`)
  )

  for (const [size, { width }] of Object.entries(CARD_BACK_SIZES)) {
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `card-backs/${size}`)
    )

    const cardBackCommandBlocks: CommandBlock[] = cardBackFiles.map((file) => {
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(file.replace(cardBacksPath, dstDir))
      )

      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize ${width} -quality 75 -strip ${context.outputFile}`
      )
    })

    await orchestrator.processCommandBlocks(cardBackCommandBlocks)
  }
}

export async function convertAndResizeStandardCardBacks(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const cardBacksPath = path.resolve(artPath, 'card-backs-standard')
  const cardBackFiles = ['base', 'silver', 'gold'].map((rarity) =>
    path.join(cardBacksPath, `cardback-standard-${rarity}.png`)
  )

  for (const [size, { width }] of Object.entries(FULL_CARD_SIZES)) {
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `cards/full-card-backs/${size}`)
    )

    const cardBackCommandBlocks: CommandBlock[] = cardBackFiles.map((file) => {
      const context = CommandBlock.createContext(
        file,
        replaceOldFormatExt(file.replace(cardBacksPath, dstDir))
      )

      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize ${width} -quality 75 -strip ${context.outputFile}`
      )
    })

    await orchestrator.processCommandBlocks(cardBackCommandBlocks)
  }
}
