import * as path from 'path'

import { artPath, webappAssetsPath } from '../../config'
import CommandBlock from '../../framework/CommandBlock'
import { CommandBlockProcessor, Task } from '../../framework/Orchestrator'
import { globAsync } from '../../framework/utils'

export { convertAndResizeArtRows } from './sub-tasks/convertAndResizeArtRows'
export {
  convertAndResizePremiumCardBacks,
  convertAndResizeStandardCardBacks
} from './sub-tasks/convertAndResizeCardBacks'
export { convertAndResizeHeroArt } from './sub-tasks/convertAndResizeHeroArt'
export { convertAndResizeHeroThumbnails } from './sub-tasks/convertAndResizeHeroThumbnails'
export { convertAndResizeQuestThumbnails } from './sub-tasks/convertAndResizeQuestThumbnails'
export { convertAndResizeSpellArt } from './sub-tasks/convertAndResizeSpellArt'
export { convertAndResizeStickers } from './sub-tasks/convertAndResizeStickers'
export { convertAndResizeTitleFrames } from './sub-tasks/convertAndResizeTitleFrames'
export { convertAndResizeUnitArt } from './sub-tasks/convertAndResizeUnitArt'
export { convertBackgrounds } from './sub-tasks/convertBackgrounds'
export { convertIcons } from './sub-tasks/convertIcons'
export { convertMisc } from './sub-tasks/convertMisc'
export { generateArtColumns } from './sub-tasks/generateArtColumns'
export { generateWebappAudioSprite } from './sub-tasks/generateAudioSprite'
export { generateCardAndHeroItems } from './sub-tasks/generateCardAndHeroItems'
export { generateDeckCoverImages } from './sub-tasks/generateDeckCoverImages'
export { generateFrames } from './sub-tasks/generateFrames'
export { generateHeroColumns } from './sub-tasks/generateHeroColumns'

export const copyFonts: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const artFontPath = path.resolve(artPath, `fonts/fonts`)
  const webappAssetsFontPath = path.resolve(webappAssetsPath, 'fonts')
  const files = await globAsync(path.resolve(artFontPath, '*'))

  const copyCommandBlocks = files.map((file) => {
    const context = CommandBlock.createContext(
      file,
      file.replace(artFontPath, webappAssetsFontPath)
    )
    return new CommandBlock(
      context,
      `cp ${context.inputFile} ${context.outputFile}`
    )
  })

  await orchestrator.processCommandBlocks(copyCommandBlocks)
}

export const copyVideo: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  task.output = 'Copying webapp video...'

  const srcVideoPath = path.join(artPath, 'video/webapp')
  const dstVideoPath = path.join(webappAssetsPath, 'video')
  const files = await globAsync(path.join(srcVideoPath, '*.mp4'))

  await orchestrator.processCommandBlocks(
    files.map((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(srcVideoPath, dstVideoPath)
      )
      return new CommandBlock(
        context,
        `cp ${context.inputFile} ${context.outputFile}`
      )
    })
  )
}
