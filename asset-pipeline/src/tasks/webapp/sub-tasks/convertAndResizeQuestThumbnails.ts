import * as path from 'path'

import { scratchAssetsPath, webappAssetsPath } from '~/config'
import { QUEST_THUMBNAIL_SIZES } from '~/constants'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { SizeConfigKey } from '~/types'

import { resizeProcessedFile } from '../shared/helpers/resizeProcessedFile'

export const convertAndResizeQuestThumbnails: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const scratchThumbnailPath = path.join(
    scratchAssetsPath,
    'cards/thumbs-far-cropped'
  )

  for (const size of Object.keys(QUEST_THUMBNAIL_SIZES)) {
    const commandBlocks = await resizeProcessedFile({
      srcPath: scratchThumbnailPath,
      dstPath: path.join(webappAssetsPath, 'cards/quest-thumbs/' + size),
      size: size as SizeConfigKey,
      sizeConfig: QUEST_THUMBNAIL_SIZES
    })

    await orchestrator.processCommandBlocks(commandBlocks)
  }
}
