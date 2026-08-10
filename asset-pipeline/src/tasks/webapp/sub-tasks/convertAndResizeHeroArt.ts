import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import * as path from 'path'

import { artPath, webappAssetsPath } from '~/config'
import { HERO_ART_SIZES } from '~/constants'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder } from '~/framework/utils'

export const convertAndResizeHeroArt: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const artUnitPath = path.resolve(artPath, 'cards/art-full/heroes')

  const artIds: string[] = []

  HeroSkinLibrary.forEach((skin) => {
    if (!artIds.includes(skin.artID)) {
      artIds.push(skin.artID)
    }
  })

  for (const hero in BASE_HERO_SKINS) {
    const artId = BASE_HERO_SKINS[hero].artID as string
    if (!artIds.includes(artId)) {
      artIds.push(artId)
    }
  }

  const files = artIds.map((artId) => {
    return path.resolve(artUnitPath, artId + '.png')
  })

  // Resize and optimize hero units
  for (const [size, { width }] of Object.entries(HERO_ART_SIZES)) {
    const resizeCommandBlocks: CommandBlock[] = []
    const dstDir = await ensureFolder(
      path.join(webappAssetsPath, `/heroes/art/${size}`)
    )

    files.forEach((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(artUnitPath, dstDir).replace('.png', `@${size}.webp`)
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
