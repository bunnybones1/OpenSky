import { CardLibrary } from '@skyweaver/state-metadata'
import * as path from 'path'

import { artPath, scratchAssetsPath, webappAssetsPath } from '~/config'
import { DECK_COVER_IMAGE_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder, globAsync } from '~/framework/utils'
import { SizeConfigKey } from '~/types'

import { resizeProcessedFile } from '../shared/helpers/resizeProcessedFile'

export const generateDeckCoverImages: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const scratchDeckCoverImagesPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/deck-cover-images')
  )
  const commandBlocks: CommandBlock[] = []
  const srcEmptyImagePath = path.join(artPath, `deck-cover-images/empty.png`)
  const srcArtAlphaImagePath = path.join(
    artPath,
    `deck-cover-images/art-alpha.png`
  )
  const srcDeckGrad90ImagePath = path.join(
    artPath,
    `deck-cover-images/deck-border-gradient-90.png`
  )
  const srcDeckGrad100ImagePath = path.join(
    artPath,
    `deck-cover-images/deck-border-gradient-100.png`
  )

  const { width, height } = DECK_COVER_IMAGE_SIZES['6x']

  const srcHeroArt = await globAsync(
    path.join(artPath, 'deck-cover-images/hero-columns/*.png')
  )

  const heroCommandBlocks = srcHeroArt.map((file) => {
    const fileSegs = file.split('/')
    const fileName = fileSegs[fileSegs.length - 1]

    const dstPath = path.join(scratchDeckCoverImagesPath, fileName)
    const context = CommandBlock.createContext([], dstPath)

    return new CommandBlock(
      context,
      `magick -depth 8 -size ${width}x${height} ` +
        `${srcEmptyImagePath} ` +
        `${file} -geometry 499x2000+79+172 -composite ` +
        `-compose Dst_In ${srcArtAlphaImagePath} -composite ` +
        `-compose Over ${srcDeckGrad90ImagePath} -composite ` +
        `${dstPath}`
    )
  })

  for (const cardID of CardLibrary.keys()) {
    const card = CardLibrary.get(cardID)!
    if (card.type === 'unit') {
      const srcUnitPath = path.join(
        artPath,
        `cards/art-full/units`,
        `${card.artSlug}.png`
      )

      const srcBackgroundPath = path.join(
        artPath,
        `cards/art-full/bgs/${card.backgroundArtSlug}.png`
      )
      const dstPath = path.join(scratchDeckCoverImagesPath, `${cardID}.png`)
      const context = CommandBlock.createContext([], dstPath)
      commandBlocks.push(
        new CommandBlock(
          context,
          `magick -depth 8 -size ${width}x${height} ` +
            `${srcEmptyImagePath} ` +
            `${srcBackgroundPath} -geometry 690x690-16+196 -composite ` +
            `${srcUnitPath} -geometry 844x844+79+201 -composite ` +
            `-compose Dst_In ${srcArtAlphaImagePath} -composite ` +
            `-compose Over ${srcDeckGrad90ImagePath} -composite ` +
            `-define png:include-chunk=none ${dstPath}`
        )
      )
    } else if (
      card.type === 'spell' ||
      card.type === 'enchant' ||
      card.type === 'heroAbility'
    ) {
      const srcSpellPath = path.join(
        artPath,
        `cards/art-full/spells`,
        `${card.artSlug}.png`
      )

      const dstPath = path.join(scratchDeckCoverImagesPath, `${cardID}.png`)
      const context = CommandBlock.createContext([], dstPath)
      commandBlocks.push(
        new CommandBlock(
          context,
          `magick -depth 8 -size ${width}x${height} ` +
            `${srcEmptyImagePath} ` +
            `${srcSpellPath} -geometry 500x500+80+180 -composite ` +
            `-compose Dst_In ${srcArtAlphaImagePath} -composite ` +
            `-compose Over ${srcDeckGrad100ImagePath} -composite ` +
            `-define png:include-chunk=none ${dstPath}`
        )
      )
    }
  }

  const deckSrcImgsPath = path.join(artPath, `deck-cover-images`)

  const cardTopfiles = await globAsync(
    path.join(deckSrcImgsPath, `deck-cards-*.png`)
  )

  const cardTopCommandBlocks = cardTopfiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(deckSrcImgsPath, scratchDeckCoverImagesPath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    cardTopCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copyinging deck card top images... ${processed}/${total} (${skipped} skipped)`
    }
  )

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Generating deck cover images... ${processed}/${total} (${skipped} skipped)`
    }
  )

  await orchestrator.processCommandBlocks(
    heroCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Generating hero deck cover images... ${processed}/${total} (${skipped} skipped)`
    }
  )

  for (const size of Object.keys(DECK_COVER_IMAGE_SIZES)) {
    const deckCoverImageSizeVars = await resizeProcessedFile({
      srcPath: scratchDeckCoverImagesPath,
      dstPath: path.join(webappAssetsPath, 'cards/deck-cover-images/' + size),
      size: size as SizeConfigKey,
      sizeConfig: DECK_COVER_IMAGE_SIZES
    })

    await orchestrator.processCommandBlocks(
      deckCoverImageSizeVars,
      (processed, skipped, total) => {
        task.output = `Resizing deck cover images... @${size}: ${processed}/${total} (${skipped} skipped)`
      }
    )
  }
}
