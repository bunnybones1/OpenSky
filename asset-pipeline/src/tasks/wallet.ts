import { CrystalLibrary } from '@opensky/shared/cosmetics'
import path from 'path'

import { artPath, assetsPath } from '../config'
import CommandBlock from '../framework/CommandBlock'
import { CommandBlockProcessor } from '../framework/Orchestrator'

export async function copyCrystalArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const crystalFiles = [...new Set([...CrystalLibrary.values()])].map(
    (crystal) => path.join(artPath, `./crystals/${crystal.artID}.png`)
  )
  await orchestrator.processCommandBlocks(
    crystalFiles.map((file) => {
      const context = CommandBlock.createContext(
        file,
        file.replace(artPath, assetsPath + '/cosmetics')
      )
      return new CommandBlock(
        context,
        `cp ${context.inputFile} ${context.outputFile}`
      )
    })
  )
}
