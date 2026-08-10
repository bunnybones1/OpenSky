import { supportedLanguages } from '@opensky/language-manager'
import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { CardLibrary } from '@skyweaver/state-metadata'
import * as path from 'path'

import { scratchAssetsPath, webappAssetsPath } from '~/config'
import { FULL_CARD_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'
import { replaceOldFormatExt } from '~/tasks/helpers/replaceOldFormatExt'

export const generateCardAndHeroItems: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Resizing and optimizing full cards...'

  for (const lang of supportedLanguages) {
    const scratchFullCardsPath = await ensureFolder(
      path.join(scratchAssetsPath, 'cards/full-cards', `/${lang}/`)
    )

    const frameExts = ['', '-silver', '-gold', '-locked'] as const

    // Resize and optimize full-cards
    for (const [size, { width, height }] of Object.entries(FULL_CARD_SIZES)) {
      const resizeCommandBlocks: CommandBlock[] = []
      const destPath = await ensureFolder(
        path.join(webappAssetsPath, `/cards/full-cards/${lang}/${size}`)
      )

      for (const cardId of CardLibrary.keys()) {
        const card = CardLibrary.get(cardId)!
        if (card.prism === 'tut') {
          continue
        }
        for (const frameExt of frameExts) {
          const filename = `${cardId}${frameExt}.png`
          const context = CommandBlock.createContext(
            path.join(scratchFullCardsPath, filename),
            replaceOldFormatExt(path.join(destPath, filename))
          )

          resizeCommandBlocks.push(
            new CommandBlock(
              context,
              `magick convert ${context.inputFile} -resize ${width}x${height}\\! -quality 75 -strip ${context.outputFile}`
            )
          )
        }
      }

      await orchestrator.processCommandBlocks(
        resizeCommandBlocks,
        (processed, skipped, total) => {
          task.output = `Converting and resizing card art... @${size}: ${processed}/${total} (${skipped} skipped)`
        }
      )
    }
  }

  const heroes = [
    ...Object.values(BASE_HERO_SKINS),
    ...new Set(HeroSkinLibrary.values())
  ]

  const scratchFullCardsPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/full-cards')
  )

  // Resize and optimize full-cards
  for (const [size, { width, height }] of Object.entries(FULL_CARD_SIZES)) {
    const resizeCommandBlocks: CommandBlock[] = []
    const destPath = await ensureFolder(
      path.join(webappAssetsPath, `/heroes/full-cards/${size}`)
    )

    for (const heroSkin of heroes) {
      const filename = `${heroSkin.artID}.png`
      const context = CommandBlock.createContext(
        path.join(scratchFullCardsPath, filename),
        replaceOldFormatExt(path.join(destPath, filename))
      )

      resizeCommandBlocks.push(
        new CommandBlock(
          context,
          `magick convert ${context.inputFile} -resize ${width}x${height}\\! -quality 75 -strip ${context.outputFile}`
        )
      )
    }

    await orchestrator.processCommandBlocks(
      resizeCommandBlocks,
      (processed, skipped, total) => {
        task.output = `Converting and resizing hero card art... @${size}: ${processed}/${total} (${skipped} skipped)`
      }
    )
  }
}
