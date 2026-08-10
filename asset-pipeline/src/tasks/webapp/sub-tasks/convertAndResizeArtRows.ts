import * as path from 'path'

import { artPath, scratchAssetsPath, webappAssetsPath } from '~/config'
import { HERO_ROW_ART_SIZES, ROW_ART_SIZES } from '~/constants'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'
import { SizeConfigKey } from '~/types'

import { resizeProcessedFile } from '../shared/helpers/resizeProcessedFile'

export const convertAndResizeArtRows: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Creating art rows...'
  const cardArtRowScratchPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/art-rows')
  )

  for (const size of Object.keys(ROW_ART_SIZES)) {
    const bgs = await resizeProcessedFile({
      srcPath: path.join(artPath, 'cards/art-rows/bgs'),
      dstPath: path.join(webappAssetsPath, 'cards/art-rows/bgs/' + size),
      size: size as SizeConfigKey,
      sizeConfig: ROW_ART_SIZES
    })

    const spells = await resizeProcessedFile({
      srcPath: path.join(artPath, 'cards/art-rows/spells'),
      dstPath: path.join(webappAssetsPath, 'cards/art-rows/spells/' + size),
      size: size as SizeConfigKey,
      sizeConfig: ROW_ART_SIZES
    })

    const units = await resizeProcessedFile({
      srcPath: path.join(cardArtRowScratchPath, 'units'),
      dstPath: path.join(webappAssetsPath, 'cards/art-rows/units/' + size),
      size: size as SizeConfigKey,
      sizeConfig: ROW_ART_SIZES
    })

    await orchestrator.processCommandBlocks(
      [...bgs, ...spells, ...units],
      (processed, skipped, total) => {
        task.output = `Resizing and converting art rows... @${size}: ${processed}/${
          total - skipped
        } (${total} total, ${skipped} skipped)`
      }
    )
  }

  for (const size of Object.keys(HERO_ROW_ART_SIZES)) {
    const heroes = await resizeProcessedFile({
      srcPath: path.join(cardArtRowScratchPath, 'heroes'),
      dstPath: path.join(webappAssetsPath, `heroes/art-rows/${size}`),
      size: size as SizeConfigKey,
      sizeConfig: HERO_ROW_ART_SIZES
    })

    await orchestrator.processCommandBlocks(
      heroes,
      (processed, skipped, total) => {
        task.output = `Creating art rows... @${size}: ${processed}/${
          total - skipped
        } (${total} total, ${skipped} skipped)`
      }
    )
  }
}
