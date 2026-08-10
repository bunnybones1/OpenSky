import { DeckClass } from '@opensky/proto'
import {
  BASE_HERO_SKINS,
  BOT_HERO,
  DECKCLASS_HEROES
} from '@opensky/shared/constants'
import { CardLibrary } from '@skyweaver/state-metadata'
import * as path from 'path'

import { artPath, scratchAssetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor } from '~/framework/Orchestrator'
import { ensureFolder, globAsync } from '~/framework/utils'

export async function processThumbnailArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const scratchThumbnailPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/thumbs')
  )

  const commandBlocks: CommandBlock[] = []

  const verticalOffsetsByCardID: Map<string, number> = new Map()

  for (const cardID of CardLibrary.keys()) {
    const card = CardLibrary.get(cardID)!
    const srcUnitPath = path.join(
      artPath,
      `cards/art-full/${card.type === 'unit' ? 'units' : 'spells'}`,
      `${card.artSlug}.png`
    )
    const inputFiles = [srcUnitPath]

    if (card.type === 'unit') {
      const srcBackgroundPath = path.join(
        artPath,
        `cards/art-full/bgs/${card.backgroundArtSlug}.png`
      )
      inputFiles.unshift(srcBackgroundPath)
    }

    const contextClose = CommandBlock.createContext(
      inputFiles,
      path.resolve(
        path.join(
          scratchThumbnailPath.replace('cards/thumbs', 'cards/thumbs-close'),
          `${cardID}-thumbnail.png`
        )
      )
    )

    let commandLineClose = ''

    if (contextClose.inputFiles.length === 1) {
      commandLineClose = `magick convert ${contextClose.inputFiles[0]} -resize 440 -define png:include-chunk=none ${contextClose.outputFile}`
    } else {
      commandLineClose = `magick convert ${contextClose.inputFiles.join(
        ' '
      )} -geometry 230%x230%-780-600 -gravity center -compose over -composite -resize 440 -define png:include-chunk=none ${
        contextClose.outputFile
      }`
    }

    verticalOffsetsByCardID.set(cardID, card.type === 'unit' ? 10 : 30) //different vertical offset for units and spells

    commandBlocks.push(new CommandBlock(contextClose, commandLineClose))

    const contextFar = CommandBlock.createContext(
      inputFiles,
      path.resolve(
        path.join(
          scratchThumbnailPath.replace('cards/thumbs', 'cards/thumbs-far'),
          `${cardID}-thumbnail.png`
        )
      )
    )

    let commandLineFar = ''

    if (contextFar.inputFiles.length === 1) {
      commandLineFar = `magick convert ${contextFar.inputFiles[0]} -resize 440 -define png:include-chunk=none ${contextFar.outputFile}`
    } else {
      commandLineFar = `magick convert ${contextFar.inputFiles.join(
        ' '
      )} -geometry 135%x135%-380-470 -gravity center -compose over -composite -resize 440 -define png:include-chunk=none ${
        contextFar.outputFile
      }`
    }

    commandBlocks.push(new CommandBlock(contextFar, commandLineFar))
  }

  const herosWithBot = { ...BASE_HERO_SKINS, BOT: BOT_HERO }
  const deckClassLookupDeckclasses: DeckClass[] = Object.keys(
    DECKCLASS_HEROES
  ) as DeckClass[]
  const deckClassLookupHeroes = deckClassLookupDeckclasses.map(
    (d) => DECKCLASS_HEROES[d]
  ) as string[]

  for (const [hero, heroAssets] of Object.entries(herosWithBot)) {
    //temporary extra work to make sure hero thumbnails are named by their prisms
    const name =
      deckClassLookupHeroes.indexOf(hero) !== -1
        ? deckClassLookupDeckclasses[deckClassLookupHeroes.indexOf(hero)]
        : hero

    const contextClose = CommandBlock.createContext(
      path.join(artPath, 'cards/thumbnails/heroes', `${heroAssets.artID}.png`),
      path.join(
        scratchThumbnailPath.replace('cards/thumbs', 'cards/thumbs-close'),
        `${name}-thumbnail.png`
      )
    )

    commandBlocks.push(
      new CommandBlock(
        contextClose,
        `cp ${contextClose.inputFile} ${contextClose.outputFile}`
      )
    )

    const contextFar = CommandBlock.createContext(
      path.join(artPath, 'cards/thumbnails/heroes', `${heroAssets.artID}.png`),
      path.join(
        scratchThumbnailPath.replace('cards/thumbs', 'cards/thumbs-far'),
        `${name}-thumbnail.png`
      )
    )

    commandBlocks.push(
      new CommandBlock(
        contextFar,
        `cp ${contextFar.inputFile} ${contextFar.outputFile}`
      )
    )
  }

  await orchestrator.processCommandBlocks(commandBlocks)

  const thumbsFarPath = path.resolve(
    scratchThumbnailPath.replace('cards/thumbs', 'cards/thumbs-far')
  )
  const thumbsFarCroppedPath = path.resolve(
    scratchThumbnailPath.replace('cards/thumbs', 'cards/thumbs-far-cropped')
  )
  const files = await globAsync(path.resolve(thumbsFarPath, '**/*.png'))

  const commandBlocks2: CommandBlock[] = files.map((file) => {
    const context = CommandBlock.createContext(
      path.resolve(file),
      file.replace(thumbsFarPath, thumbsFarCroppedPath)
    )
    const cardID = path
      .resolve(context.inputFile)
      .split(path.sep)
      .pop()!
      .split('-thumbnail')[0]
    const offset = verticalOffsetsByCardID.get(cardID) || 0
    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize 360x360 -extent 360x192+0+${offset} -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(commandBlocks2)
}
