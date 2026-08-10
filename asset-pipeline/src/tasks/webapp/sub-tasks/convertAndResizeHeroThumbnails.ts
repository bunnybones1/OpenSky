import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import * as path from 'path'

import { artPath, webappAssetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor } from '~/framework/Orchestrator'
import { ensureFolder, lookForMissingFiles } from '~/framework/utils'

export async function convertAndResizeHeroThumbnails(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artHeroThumbnailPath = path.resolve(artPath, 'cards/thumbnails/heroes')

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
    return path.resolve(artHeroThumbnailPath, artId + '.png')
  })

  const missingFiles = await lookForMissingFiles(files)

  if (missingFiles) {
    throw new Error(
      'Aborting because files are missing: ' + missingFiles.toString()
    )
  }

  const dstDir = await ensureFolder(
    path.resolve(webappAssetsPath, 'heroes/thumbnails')
  )

  const commandBlocks = files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artHeroThumbnailPath, dstDir).replace('.png', '.webp')
    )
    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize 200x200\\! -quality 75 -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(commandBlocks)
}
