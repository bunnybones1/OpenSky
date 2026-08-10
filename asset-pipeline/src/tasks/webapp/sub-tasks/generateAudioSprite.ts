import * as path from 'path'

import {
  artPath, webappAssetsPath,
} from '../../../config'
import CommandBlock, { CommandContext } from '../../../framework/CommandBlock'
import { CommandBlockProcessor } from '../../../framework/Orchestrator'
import {
  globAsync, localizeFileStrings,
} from '../../../framework/utils'

export const generateWebappAudioSprite = async (orchestrator: CommandBlockProcessor, task: ListrTask) => {
// "build:audio:common": "audiosprite --output audio/fx/common --format howler audio/fx/common/*.wav",
  // "build:audio:cards": "audiosprite --output audio/fx/cards --format howler audio/fx/cards/*.wav",
  // "build:audio:matchend": "audiosprite --output audio/fx/matchend --format howler audio/fx/matchend/*.wav"

  task.output = `Creating audio sprite for webapp...`

  const exts = ['json', 'ac3', 'm4a', 'mp3', 'ogg']

  const commandBlocks: CommandBlock[] = []

  const regularFXFiles = await globAsync(
    path.join(artPath, 'audio/webapp', '*.{wav,mp3}')
  )

  const localizedRegularFXFiles = regularFXFiles
    .filter(Boolean)
    .map(localizeFileStrings)

  const inputFileNames = localizedRegularFXFiles.map((p) =>
    path.basename(p, p.includes('mp3') ? '.mp3' : '.wav')
  )

  const variationFXFiles = await globAsync(
    path.join(
      artPath,
      'audio/webapp',
      `{${inputFileNames.join(',')}}`,
      '*.{wav,mp3}'
    )
  )

  const variationSFX = variationFXFiles.map<{
    filename: string
    baseFileName: string
    number: number,
    ext: string
  }>((inputFileName) => {
    const parentFolder = path.basename(path.dirname(inputFileName))

    const ext = inputFileName.includes('mp3') ? 'mp3' : 'wav'

    const filename = path.basename(inputFileName, `.${ext}`)
    const ending = filename.slice(filename.length - 3)
    const baseFileName = filename.slice(0, filename.length - 3)

    if (baseFileName !== parentFolder) {
      throw new Error(
        `Invalid variation filename ${inputFileName} for base fx ${parentFolder}, expected a filename in the format ${parentFolder}_xx.${ext}`
      )
    }

    if (ending.slice(0, 1) !== '_') {
      throw new Error(
        `Invalid varation filename ${inputFileName}, expected a filename in the format ${parentFolder}_xx.${ext}`
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
      baseFileName,
      ext
    }
  })

  // Verify that each variation has a base SFX.
  for (const variation of variationSFX) {

    const baseFX = path.join(
      path.dirname(path.dirname(variation.filename)),
      variation.baseFileName + `.${variation.ext}`
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

  const relativeOutputPath = path.join(webappAssetsPath, 'audio')

  const regularContext = new CommandContext(
    regularFXFiles,
    exts.map((ext) => path.join(webappAssetsPath, `audio/webapp.${ext}`))
  )

  const outputFile = path.join(relativeOutputPath, 'webapp')
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
        path.join(webappAssetsPath, `audio/webapp_variations.${ext}`)
      )
    )
    const variationsFile = path.join(relativeOutputPath, 'webapp_variations')
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
  

  await orchestrator.processCommandBlocks(
    commandBlocks,
    (processed, skipped, total) => {
      task.output = `Generating audio sprites... ${processed}/${total} (${skipped} skipped)`
    }
  )
}