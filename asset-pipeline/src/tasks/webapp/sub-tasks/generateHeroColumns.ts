import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import * as path from 'path'

import { artPath, scratchAssetsPath, webappAssetsPath } from '~/config'
import { FULL_CARD_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'
import compositeArtColumn from '~/tasks/webapp/shared/helpers/compositeArtColumn'
import { SizeConfigKey } from '~/types'

import { resizeProcessedFile } from '../shared/helpers/resizeProcessedFile'

export const generateHeroColumns: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const scratchHeroArtPath = await ensureFolder(
    path.join(scratchAssetsPath, 'hero-art')
  )
  const commandBlocks: CommandBlock[] = []
  const artUnitPath = path.resolve(artPath, 'cards/art-full/heroes')

  const artAndBgIds: { artID: string; bgID: string }[] = []

  HeroSkinLibrary.forEach((skin) => {
    if (!artAndBgIds.some((ids) => ids.artID === skin.artID)) {
      artAndBgIds.push({ artID: skin.artID, bgID: skin.bgID })
    }
  })

  for (const hero in BASE_HERO_SKINS) {
    const artID = BASE_HERO_SKINS[hero].artID as string
    const bgID = BASE_HERO_SKINS[hero].bgID as string
    if (!artAndBgIds.some((ids) => ids.artID === artID)) {
      artAndBgIds.push({ artID, bgID })
    }
  }

  artAndBgIds.forEach((ids) => {
    const heroArtPath = path.resolve(artUnitPath, ids.artID + '.png')
    const backgroundPath = path.join(
      artPath,
      `cards/art-full/bgs/${ids.bgID}.png`
    )
    const contextSource = [heroArtPath, backgroundPath]

    const context = CommandBlock.createContext(
      contextSource,
      path.join(scratchHeroArtPath, `${ids.artID}-column.webp`)
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
  })

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Generating hero art columns... ${processed}/${total} (${skipped} skipped)`
    }
  )

  for (const size of Object.keys(FULL_CARD_SIZES)) {
    const columns = await resizeProcessedFile({
      srcPath: scratchHeroArtPath,
      dstPath: path.join(webappAssetsPath, 'heroes/columns/' + size),
      size: size as SizeConfigKey,
      sizeConfig: FULL_CARD_SIZES
    })

    await orchestrator.processCommandBlocks(
      columns,
      (processed, skipped, total) => {
        task.output = `Resizing hero art columnms... @${size}: ${processed}/${total} (${skipped} skipped)`
      }
    )
  }
}
