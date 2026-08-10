import { CardLibrary } from '@skyweaver/state-metadata'
import * as path from 'path'

import { artPath, scratchAssetsPath, webappAssetsPath } from '~/config'
import { FULL_CARD_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'
import compositeArtColumn from '~/tasks/webapp/shared/helpers/compositeArtColumn'
import { SizeConfigKey } from '~/types'

import { resizeProcessedFile } from '../shared/helpers/resizeProcessedFile'

export const generateArtColumns: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const scratchArtColumnsPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/art-columns')
  )
  const commandBlocks: CommandBlock[] = []
  for (const cardID of CardLibrary.keys()) {
    const card = CardLibrary.get(cardID)!
    const srcUnitPath = path.join(
      artPath,
      `cards/art-full/${card.type === 'unit' ? 'units' : 'spells'}`,
      `${card.artSlug}.png`
    )
    const contextSource = [srcUnitPath]

    if (card.type === 'unit') {
      const srcBackgroundPath = path.join(
        artPath,
        `cards/art-full/bgs/${card.backgroundArtSlug}.png`
      )
      contextSource.push(srcBackgroundPath)
    }

    const context = CommandBlock.createContext(
      contextSource,
      path.join(scratchArtColumnsPath, `${cardID}-column.webp`)
    )

    commandBlocks.push(
      new CommandBlock(context, async () => {
        await compositeArtColumn(
          context.inputFiles[0],
          context.inputFiles[1],
          context.outputFile
        )
      })
    )
  }

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Generating art columns... ${processed}/${total} (${skipped} skipped)`
    }
  )

  for (const size of Object.keys(FULL_CARD_SIZES)) {
    const columns = await resizeProcessedFile({
      srcPath: scratchArtColumnsPath,
      dstPath: path.join(webappAssetsPath, 'cards/art-columns/' + size),
      size: size as SizeConfigKey,
      sizeConfig: FULL_CARD_SIZES
    })

    await orchestrator.processCommandBlocks(
      columns,
      (processed, skipped, total) => {
        task.output = `Resizing art columnms... @${size}: ${processed}/${total} (${skipped} skipped)`
      }
    )
  }
}
