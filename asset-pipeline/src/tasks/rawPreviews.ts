import * as path from 'path'

import { artPath, rawPreviewsAssetsPath } from '../config'
import CommandBlock from '../framework/CommandBlock'
import { CommandBlockProcessor } from '../framework/Orchestrator'
import { globAsync } from '../framework/utils'

async function webappJpegBlocks(srcPath: string, dstPath: string) {
  const files = await globAsync(path.resolve(srcPath, '**/*.png'))

  return files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(srcPath, dstPath).replace('.png', `.jpeg`)
    )
    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -background gray -alpha Remove -resize 216 -strip -quality 65% ${context.outputFile}`
    )
  })
}

export async function generatePreviews(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Generating raw art previews...'

  const rawPreviewPaths = [
    'cards/art-full',
    'stickers',
    'crystals',
    'card-backs-premium'
  ]
  const rawArtPreviews = await Promise.all(
    rawPreviewPaths.map((p) =>
      webappJpegBlocks(
        path.join(artPath, p),
        path.join(rawPreviewsAssetsPath, p)
      )
    )
  ).then((d) => d.reduce((arr, row) => arr.concat(row), []))

  await orchestrator.processCommandBlocks(
    rawArtPreviews,
    (processed, skipped, total) => {
      task.output = `Creating raw art previews... : ${processed}/${total} (${skipped} skipped)`
    }
  )
}
