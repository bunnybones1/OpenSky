import * as path from 'path'

import CommandBlock from '~/framework/CommandBlock'
import { globAsync } from '~/framework/utils'
import { SizeConfig, SizeConfigKey } from '~/types'

interface ResizeProcessedFileArgs {
  srcPath: string
  dstPath: string
  size: SizeConfigKey
  sizeConfig: SizeConfig
  srcExt?: string
}

export async function resizeProcessedFile({
  srcPath,
  dstPath,
  size,
  sizeConfig,
  srcExt = 'png'
}: ResizeProcessedFileArgs) {
  const files = await globAsync(path.resolve(srcPath, `**/*.${srcExt}`))

  return files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(srcPath, dstPath).replace(`.${srcExt}`, `@${size}.webp`)
    )
    return new CommandBlock(
      context,
      `magick convert ${context.inputFile} -resize ${sizeConfig[size].width} -quality 90 -strip ${context.outputFile}`
    )
  })
}
