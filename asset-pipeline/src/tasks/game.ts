import { supportedLanguages } from '@opensky/language-manager'
import { DeckClass } from '@opensky/proto'
import {
  BASE_HERO_SKINS,
  BOT_HERO,
  DECKCLASS_HEROES
} from '@opensky/shared/constants'
import { StickerLibrary } from '@opensky/shared/cosmetics'
import { CardLibrary } from '@skyweaver/state-metadata'
import * as path from 'path'
import { basename, dirname } from 'path'

import {
  artPath,
  assetsPath,
  gameAssetsPath,
  scratchAssetsPath
} from '../config'
import CommandBlock, { CommandContext } from '../framework/CommandBlock'
import { doesFolderFlagExist } from '../framework/folderFlags'
import { CommandBlockProcessor } from '../framework/Orchestrator'
import {
  ensureFolder,
  existsAsync,
  globAsync,
  isForcedOpaque,
  localizeFileStrings
} from '../framework/utils'

function isProtectedImagePattern(file: string): boolean {
  return (
    file.includes('sky-sun-stars-lights-clouds-day-cycle') ||
    file.includes('palette') ||
    // file.includes('game' + path.sep + 'models' + path.sep) ||
    file.includes(path.sep + 'fonts' + path.sep)
  )
}

export async function copyModels(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Copying game models...' //should run extra dedup/transforms in future

  let files = await globAsync(path.resolve(artPath, 'game/models/**/*.json'))
  const modelCommandBlocks = files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artPath, assetsPath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    modelCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying game json models ... ${processed}/${total} (${skipped} skipped)`
    }
  )
  files = await globAsync(path.resolve(artPath, 'game/models/**/*.gltf'))
  const minifyFiles = files.filter((v) => v.includes('meshAnimations'))
  const nonMinifyFiles = files.filter((v) => !v.includes('meshAnimations'))
  const commandMaker = async (
    commandStringMaker: (context: CommandContext) => string,
    file: string,
    outputExpansionExtensions: string[]
  ) => {
    const maybeBin = path.join(
      dirname(file),
      basename(file).split('.gltf').join('.bin')
    )
    const inputFiles = [
      file,
      ...((await existsAsync(maybeBin)) ? [maybeBin] : [])
    ]
    const context = CommandBlock.createContext(
      inputFiles,
      inputFiles
        .map((i) => i.replace(artPath, assetsPath))
        .flatMap((i) =>
          outputExpansionExtensions.map((o) =>
            i.replace(/(\.gltf|\.bin)/, `${o}$1`)
          )
        )
    )
    return new CommandBlock(context, commandStringMaker(context))
  }
  const nonMinifiedModelCommandBlocks = await Promise.all(
    nonMinifyFiles.map((file) =>
      commandMaker(
        (context: CommandContext) =>
          `gltf-transform dedup ${context.inputFile} ${context.outputFile}`,
        file,
        ['']
      )
    )
  )

  const minifiedModelCommandBlocks = await Promise.all(
    minifyFiles.map((file) =>
      commandMaker(
        (context: CommandContext) =>
          `gltf-transform draco ${
            context.inputFile
          } ${context.outputFile.replace(
            '.gltf',
            '.draco.gltf'
          )} && mv ${context.outputFile.replace(
            '.gltf',
            '.bin'
          )} ${context.outputFile.replace(
            '.gltf',
            '.draco.bin'
          )} && gltf-transform meshopt ${
            context.inputFile
          } ${context.outputFile.replace(
            '.gltf',
            '.meshopt.gltf'
          )} && mv ${context.outputFile.replace(
            '.gltf',
            '.bin'
          )} ${context.outputFile.replace(
            '.gltf',
            '.meshopt.bin'
          )} && gltf-transform quantize ${
            context.inputFile
          } ${context.outputFile.replace(
            '.gltf',
            '.quantize.gltf'
          )} && mv ${context.outputFile.replace(
            '.gltf',
            '.bin'
          )} ${context.outputFile.replace(
            '.gltf',
            '.quantize.bin'
          )} && gltf-transform dedup ${context.inputFile} ${
            context.outputFile
          }`,
        file,
        ['', '.draco', '.meshopt', '.quantize']
      )
    )
  )

  for (const cb of nonMinifiedModelCommandBlocks) {
    modelCommandBlocks.push(cb)
  }

  for (const cb of minifiedModelCommandBlocks) {
    modelCommandBlocks.push(cb)
  }

  await orchestrator.processCommandBlocks(
    modelCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying game gltf models ... ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function copyHighQualityMiscGameArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Copying high quality game-specific misc art to game...'

  const miscArtFiles = await globAsync(path.resolve(artPath, 'game/**/*.png'))
  const miscArtCommandBlocks = miscArtFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artPath, assetsPath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(miscArtCommandBlocks)
}

export async function copyHighQualityMiscCommonArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Copying high quality misc art to game...'
  const miscArtFiles = (
    await Promise.all(
      ['prize-icons', 'rank-badges'].map((subPath) =>
        globAsync(path.resolve(artPath, subPath, '**/*.png'))
      )
    )
  ).flat()

  const assetsGamePath = path.resolve(assetsPath, 'game')

  const miscArtCommandBlocks = miscArtFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artPath, assetsGamePath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    miscArtCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying high quality misc art to game... ${processed}/${total} (${skipped} skipped)`
    }
  )

  const prismArtFiles = await globAsync(
    path.resolve(artPath, 'prisms', '*.png')
  )

  const prismArtCommandBlocks = prismArtFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artPath, assetsGamePath)
    )
    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize 128 -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    prismArtCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying prism art to game... ${processed}/${total} (${skipped} skipped)`
    }
  )

  const prismArtLargeCommandBlocks = prismArtFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artPath, assetsGamePath).replace('prisms', 'prisms/large')
    )
    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize 256 -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    prismArtLargeCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying large prism art to game... ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function copyHighQualityCardArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Copying high quality game card art...'

  const fileGroups = await Promise.all(
    [
      'cards/art-full/**/*.png'
      // 'cards/art-rows/bgs/*.png', //no longer good to just copy. These need to be uvChopped
      // 'cards/art-rows/spells/*.png' //no longer good to just copy. These need to be uvChopped
    ].map((globStr) => globAsync(path.resolve(artPath, globStr)))
  )
  const cardArtFiles = fileGroups.flat()
  const assetsGameCardsPath = path.resolve(assetsPath, 'game')
  const cardArtCommandBlocks = cardArtFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artPath, assetsGameCardsPath)
    )
    return new CommandBlock(
      context,
      context.inputFile.includes('heroes')
        ? `magick convert ${context.inputFile} -resize 648 -strip ${context.outputFile}`
        : `cp ${context.inputFile} ${context.outputFile}`
      // the following doesn't work on MacOS
      // `identify ${context.inputFile} | grep 8-bit && cp ${context.inputFile} ${context.outputFile} || >&2 echo "incorrect color depth for image ${context.inputFile}" && exit 1`,
      // 1
    )
  })

  await orchestrator.processCommandBlocks(cardArtCommandBlocks)
}

export async function UVChopRowArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'UV Chopping row art...'

  const cardArtRowScratchPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/art-rows')
  )

  async function uvChopBlocks(srcPath: string, dstPath: string) {
    //log(`UV Chop from ${srcPath} to ${dstPath}`)
    const files = await globAsync(path.resolve(srcPath, '**/*.png'))
    //shell command:
    //convert test.png -gravity NorthEast -extent 51%x200% -gravity SouthWest test.png -composite -define png:include-chunk=none test2.png
    return files.map((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(srcPath, dstPath)
      )
      return new CommandBlock(
        context,
        `magick convert ${context.inputFile} -background transparent -gravity NorthEast -extent 51%x200% -gravity SouthWest ${context.inputFile} -composite -define png:include-chunk=none ${context.outputFile}`
      )
    })
  }

  const bgs = await uvChopBlocks(
    path.resolve(artPath, 'cards/art-rows/bgs'),
    path.resolve(gameAssetsPath, 'cards/art-rows/bgs')
  )

  const spells = await uvChopBlocks(
    path.resolve(artPath, 'cards/art-rows/spells'),
    path.resolve(gameAssetsPath, 'cards/art-rows/spells')
  )

  const units = await uvChopBlocks(
    path.resolve(cardArtRowScratchPath, 'units'),
    path.resolve(gameAssetsPath, 'cards/art-rows/units')
  )

  const heroes = await uvChopBlocks(
    path.resolve(cardArtRowScratchPath, 'heroes'),
    path.resolve(gameAssetsPath, 'cards/art-rows/heroes')
  )

  const splash = await uvChopBlocks(
    path.resolve(artPath, 'splash'),
    path.resolve(gameAssetsPath, 'splash')
  )

  await orchestrator.processCommandBlocks([
    ...bgs,
    ...spells,
    ...units,
    ...heroes,
    ...splash
  ])
}

export async function generateCardThumbnails(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const scratchThumbnailPath = path.join(
    scratchAssetsPath,
    'cards/thumbs-close'
  )
  const gameThumbnailPath = path.join(gameAssetsPath, 'cards/thumbs')

  const commandBlocks: CommandBlock[] = []

  for (const id of CardLibrary.keys()) {
    const context = CommandBlock.createContext(
      path.join(scratchThumbnailPath, `${id}-thumbnail.png`),
      path.join(gameThumbnailPath, `${id}.png`)
    )
    commandBlocks.push(
      new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize 256 -strip ${context.outputFile}`
      )
    )
  }

  const herosWithBot = { ...BASE_HERO_SKINS, BOT: BOT_HERO }
  const deckClassLookupDeckclasses: DeckClass[] = Object.keys(
    DECKCLASS_HEROES
  ) as DeckClass[]
  const deckClassLookupHeroes = deckClassLookupDeckclasses.map(
    (d) => DECKCLASS_HEROES[d]
  ) as string[]

  for (const hero of Object.keys(herosWithBot)) {
    //temporary extra work to make sure hero thumbnails are named by their prisms
    const name =
      deckClassLookupHeroes.indexOf(hero) !== -1
        ? deckClassLookupDeckclasses[deckClassLookupHeroes.indexOf(hero)]
        : hero
    const context = CommandBlock.createContext(
      path.join(scratchThumbnailPath, `${name}-thumbnail.png`),
      path.join(gameThumbnailPath, `${name}.png`)
    )
    commandBlocks.push(
      new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize 256 -strip ${context.outputFile}`
      )
    )
  }

  await orchestrator.processCommandBlocks(commandBlocks)
}

export async function generateBlurredHeroAbilityArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artSpellPath = path.resolve(artPath, `cards/art-full/spells`)

  const blurredSpellPath = path.join(gameAssetsPath, 'cards/art-full/bgs/')

  const commandBlocks: CommandBlock[] = []

  const assetsToBlur = Array.from(
    new Set(
      Array.from(CardLibrary.keys())
        .map((id) => CardLibrary.get(id)!)
        .filter((card) => card.type === 'heroAbility')
        .map((card) => card.artSlug)
    )
  )

  for (const cardAsset of assetsToBlur) {
    const context = CommandBlock.createContext(
      path.join(artSpellPath, `${cardAsset}.png`),
      path.join(blurredSpellPath, `${cardAsset}-blurred.png`)
    )
    commandBlocks.push(
      new CommandBlock(
        context,
        `magick convert ${context.inputFile} -resize 256 -gaussian-blur 16x16 -gaussian-blur 16x16 -strip ${context.outputFile}`
      )
    )
  }

  await orchestrator.processCommandBlocks(commandBlocks)
}

export async function createResponsiveImageSizes(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = `Resizing images...`

  const masterImages = await (
    await globAsync(path.resolve(assetsPath, 'game/**/*.png'))
  ).filter((file) => !(file.includes('@') || isProtectedImagePattern(file)))

  const sizes = [70, 50, 35, 25]

  for (const size of sizes) {
    const resizeCommandBlocks = await Promise.all(
      masterImages.map(async (file) => {
        const context = CommandBlock.createContext(
          file,
          file.replace('.png', `.@${size}p.png`)
        )
        const opaque =
          isForcedOpaque(file) || (await doesFolderFlagExist(file, 'opaque'))
        const isModelTexture = file.includes('game/models/') && !opaque
        //https://www.imagemagick.org/Usage/formats/#png_write

        return new CommandBlock(
          context,
          `magick convert ${context.inputFile}${
            isModelTexture ? ' -channel RGBA -separate' : ''
          } -resize ${size}%${
            opaque ? ' -alpha off' : ''
          } -define png:color-type=${opaque ? 2 : 6}${
            isModelTexture ? ' -combine' : ''
          } -depth 8 -define png:include-chunk=none ${context.outputFile}`
        )
      })
    )

    await orchestrator.processCommandBlocks(resizeCommandBlocks)
  }
}

export async function createGLTextures(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const pngImages = (
    await globAsync(path.resolve(assetsPath, 'game/**/*.png'))
  ).filter((file) => !isProtectedImagePattern(file))
  type TextureCompressionCommandMaker = (
    file: string,
    highQual: boolean,
    transparent: boolean
  ) => {
    outputFile: string
    additionalArgs: string
  }

  const textureCommandMakers: {
    [K: string]: TextureCompressionCommandMaker
  } = {
    dxt: (file, hq, transparent) => ({
      outputFile: `${file}.s3tc.COMPRESSED_S3TC_DXT_EXT.ktx`,
      additionalArgs: `-t s3tc -c DXT${
        transparent ? 5 : 1
      } -q better -f rescalemode\\ nearest`
    }), //OSX
    astc: (file) => ({
      outputFile: `${file}.astc.COMPRESSED_ASTC_8x8_KHR.ktx`,
      additionalArgs: `-t astc -c ASTC_8x8 -q astcmedium -f`
    }), //Android
    pvrtc: (file, hq, transparent) => ({
      outputFile: `${file}.pvrtc.COMPRESSED_PVRTC1_2.ktx`,
      additionalArgs: `-t pvrtc -c ${
        transparent ? `PVRTC1_${hq ? 4 : 2}` : `PVRTC1_2_RGB`
      } -q pvrtchigh`
    }) //iOS
  }

  for (const formatKey of Object.keys(textureCommandMakers)) {
    task.output = `Collecting textures... ${formatKey}`
    const maker = textureCommandMakers[formatKey]
    const textureCommandBlocks = await Promise.all(
      pngImages.map(async (file) => {
        const { outputFile, additionalArgs } = maker(
          file,
          await doesFolderFlagExist(file, 'hq'),
          !(isForcedOpaque(file) || (await doesFolderFlagExist(file, 'opaque')))
        )

        const context = CommandBlock.createContext(file, outputFile)
        return new CommandBlock(
          context,
          `pnpm texture-compressor -i ${context.inputFile} -o ${context.outputFile} ${additionalArgs}`
        )
      })
    )

    await orchestrator.processCommandBlocks(
      textureCommandBlocks,
      (processed, skipped, total) => {
        task.output = `${formatKey}: ${processed}/${
          total - skipped
        } (${total} total, ${skipped} skipped)`
      }
    )
  }
}

export async function copyFontTextures(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const assetsGameFontPath = path.resolve(assetsPath, 'game/fonts')
  const renderedBMFontsPath = path.resolve(scratchAssetsPath, `fonts/bmfont`)
  const outputExts = ['json', 'png']

  const bmfontTexturesAndJson = (
    await Promise.all(
      supportedLanguages.flatMap((lang) =>
        outputExts.map((ext) =>
          globAsync(path.resolve(renderedBMFontsPath, `${lang}/*.${ext}`))
        )
      )
    )
  ).flat()

  const fontDeliveryCommandBlocks = bmfontTexturesAndJson.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(renderedBMFontsPath, assetsGameFontPath)
    )
    if (path.extname(context.outputFile) === '.json') {
      return new CommandBlock(
        context,
        `node minifyjson.js ${context.inputFile} ${context.outputFile}`
      )
    } else {
      return new CommandBlock(
        context,
        `cp ${context.inputFile} ${context.outputFile}`
      )
    }
  })

  await orchestrator.processCommandBlocks(
    fontDeliveryCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Delivering processed font files... ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function copyMusic(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artMusicPath = path.join(artPath, 'audio/music')
  const gameMusicPath = await ensureFolder(
    path.join(gameAssetsPath, 'audio/music')
  )

  const files = await globAsync(path.join(artMusicPath, '*.mp3'))
  const commandBlocks = files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artMusicPath, gameMusicPath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying game music... ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function copyTutorialAudio(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artTutorialAudioPath = path.join(artPath, 'audio/tutorial')
  const gameMusicPath = await ensureFolder(
    path.join(gameAssetsPath, 'audio/tutorial')
  )

  const files = await globAsync(path.join(artTutorialAudioPath, '*.mp3'))
  const commandBlocks = files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artTutorialAudioPath, gameMusicPath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying tutorial audio... ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function copyRawAudioFX(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Copying raw audio fx...'

  for (const collection of ['common', 'cards', 'matchend', 'tutorial']) {
    const srcAudioPath = path.join(artPath, 'audio/fx/' + collection)
    const dstAudioPath = path.join(gameAssetsPath, 'audio/fx/raw/' + collection)
    const files = await globAsync(path.join(srcAudioPath, '**', '*.wav'))

    await orchestrator.processCommandBlocks(
      files.map((file) => {
        const context = CommandBlock.createContext(
          file,
          file.replace(srcAudioPath, dstAudioPath)
        )
        return new CommandBlock(
          context,
          `cp ${context.inputFile} ${context.outputFile}`
        )
      }),
      (processed, skipped, total) => {
        task.output = `Copying raw audio fx ... ${processed}/${total} (${skipped} skipped)`
      }
    )
  }
}

export async function generateAudioFXSprites(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  // "build:audio:common": "audiosprite --output audio/fx/common --format howler audio/fx/common/*.wav",
  // "build:audio:cards": "audiosprite --output audio/fx/cards --format howler audio/fx/cards/*.wav",
  // "build:audio:matchend": "audiosprite --output audio/fx/matchend --format howler audio/fx/matchend/*.wav"

  task.output = `Creating audio sprites textures...`

  const packs = ['common', 'cards', 'matchend', 'tutorial']
  const exts = ['json', 'ac3', 'm4a', 'mp3', 'ogg']

  const commandBlocks: CommandBlock[] = []

  for (const pack of packs) {
    const regularFXFiles = await globAsync(
      path.join(artPath, 'audio/fx', pack, '*.wav')
    )
    const localizedRegularFXFiles = regularFXFiles
      .filter(Boolean)
      .map(localizeFileStrings)

    const inputFileNames = localizedRegularFXFiles.map((p) =>
      path.basename(p, '.wav')
    )
    const variationFXFiles = await globAsync(
      path.join(
        artPath,
        'audio/fx',
        pack,
        `{${inputFileNames.join(',')}}`,
        '*.wav'
      )
    )

    const variationSFX = variationFXFiles.map<{
      filename: string
      baseFileName: string
      number: number
    }>((inputFileName) => {
      const parentFolder = path.basename(path.dirname(inputFileName))

      const filename = path.basename(inputFileName, '.wav')
      const ending = filename.slice(filename.length - 3)
      const baseFileName = filename.slice(0, filename.length - 3)

      if (baseFileName !== parentFolder) {
        throw new Error(
          `Invalid variation filename ${inputFileName} for base fx ${parentFolder}, expected a filename in the format ${parentFolder}_xx.wav`
        )
      }

      if (ending.slice(0, 1) !== '_') {
        throw new Error(
          `Invalid varation filename ${inputFileName}, expected a filename in the format ${parentFolder}_xx.wav`
        )
      }

      const variationNumString = ending.slice(1)
      const variationNum = Number.parseInt(variationNumString)
      if (Number.isNaN(variationNum)) {
        throw new Error(
          `Invalid variation number ${variationNum} in sfx file ${inputFileName}, expected a number 0-99.`
        )
      }
      return {
        filename: inputFileName,
        number: variationNum,
        baseFileName
      }
    })

    // Verify that each variation has a base SFX.
    for (const variation of variationSFX) {
      const baseFX = path.join(
        path.dirname(path.dirname(variation.filename)),
        variation.baseFileName + '.wav'
      )
      if (!regularFXFiles.includes(baseFX)) {
        throw new Error(
          `Expected a non-variation version of ${variation.filename} located at ${baseFX}.`
        )
      }
    }

    const groupedVarations = variationSFX.reduce<Map<string, number[]>>(
      (map, variation) => {
        if (map.has(variation.baseFileName)) {
          map.get(variation.baseFileName)!.push(variation.number)
        } else {
          map.set(variation.baseFileName, [variation.number])
        }
        return map
      },
      new Map()
    )

    // Verify that variations are 1-n, not missing any.
    for (const [name, group] of groupedVarations.entries()) {
      group.sort().forEach((value, index) => {
        if (value !== index + 1) {
          throw new Error(
            `Invalid variation number ${value} for sfx ${name}. Expected [${Array.from(
              { length: group.length },
              (_, i) => i + 1 // variations start at 1
            )}], got [${group}]`
          )
        }
      })
    }

    const makeSpriteCommand = (outputFile: string, inputFiles: string[]) =>
      `pnpm audiosprite --output ${outputFile} --log error --channels 2 --format howler ${inputFiles.join(
        ' '
      )} && perl -pi -e 's|../../OpenSky-assets/||ig' ${outputFile}.json`

    const relativeOutputPath = path.join(gameAssetsPath, 'audio/fx')

    const regularContext = new CommandContext(
      regularFXFiles,
      exts.map((ext) => path.join(gameAssetsPath, `audio/fx/${pack}.${ext}`))
    )

    const outputFile = path.join(relativeOutputPath, pack)
    commandBlocks.push(
      new CommandBlock(
        regularContext,
        makeSpriteCommand(outputFile, regularContext.inputFiles)
      )
    )

    // Only generate variations SFX sprite if there are any variations in that subfolder
    if (variationSFX.length) {
      const variationsCounts = Object.fromEntries(
        [...groupedVarations.entries()].map(([key, nums]) => [key, nums.length])
      )
      const variationsContext = new CommandContext(
        regularFXFiles,
        exts.map((ext) =>
          path.join(gameAssetsPath, `audio/fx/${pack}_variations.${ext}`)
        )
      )
      const variationsFile = path.join(relativeOutputPath, pack + '_variations')
      commandBlocks.push(
        new CommandBlock(
          variationsContext,
          makeSpriteCommand(
            variationsFile,
            variationSFX.map((f) => f.filename)
          ) +
            ` && sed -i -e 's/^}/  ,"variations": ${JSON.stringify(
              variationsCounts,
              null,
              2
            ).replaceAll('\n', '\\\n')}\\\n}/' ${variationsFile}.json`
        )
      )
    }
  }

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Generating audio sprites... ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function prepareStickerArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artStickersPath = path.resolve(artPath, 'stickers')
  const stickerFiles = [...new Set([...StickerLibrary.values()])].map(
    (sticker) => path.join(artStickersPath, `${sticker.artID}.png`)
  )
  const dstDir = await ensureFolder(path.join(gameAssetsPath, `stickers`))

  const prismCommandBlocks: CommandBlock[] = stickerFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artStickersPath, dstDir)
    )

    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize 512 -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    prismCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying stickers... : ${processed}/${total} (${skipped} skipped)`
    }
  )
}

export async function prepareTitleArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artTitlesPath = path.resolve(artPath, 'titles/')
  const titleFiles = await globAsync(path.resolve(artTitlesPath, '*.png'))
  const dstDir = await ensureFolder(path.join(gameAssetsPath, `titles`))

  const prismCommandBlocks: CommandBlock[] = titleFiles.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artTitlesPath, dstDir)
    )

    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -strip ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(
    prismCommandBlocks,
    (processed, skipped, total) => {
      task.output = `Copying Titles... : ${processed}/${total} (${skipped} skipped)`
    }
  )
}