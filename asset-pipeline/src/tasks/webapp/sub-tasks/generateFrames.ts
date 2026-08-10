import * as path from 'path'
import puppeteer, { Browser, ScreenshotOptions } from 'puppeteer'

import { artPath, webappAssetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor, Task } from '~/framework/Orchestrator'
import { ensureFolder, readFileAsync } from '~/framework/utils'

const convertFrameSVGToWebp = async (
  browser: Browser,
  svgString: string,
  options?: Partial<ScreenshotOptions>
) => {
  const page = await browser.newPage()

  page.setContent(`
    <html>
        <body>${svgString}</body>
    </html>
  `)

  // XXX: These are magical numbers that should be constantized.
  await page.setViewport({ height: 880, width: 620 })

  await page.screenshot({
    omitBackground: true,
    ...options,
    type: 'webp'
  })

  await page.close()
}

export const generateFrames: Task = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const frameSrcPath = path.join(artPath, 'webapp/card-composite/frame')
  const frameDstPath = await ensureFolder(
    path.join(webappAssetsPath, 'cards/full-cards')
  )
  const DROP_SHADOW_FRAME_CLIP = {
    height: 880,
    width: 600,
    x: 10,
    y: 0
  }

  const files = [
    path.join(frameSrcPath, 'frame-highlight.svg'),
    path.join(frameSrcPath, 'frame-shadow.svg')
  ]

  const commandBlocks: CommandBlock[] = []
  for (const file of files) {
    const context = CommandBlock.createContext(
      file,
      file.replace(frameSrcPath, frameDstPath).replace('.svg', `.webp`)
    )
    commandBlocks.push(
      new CommandBlock(context, async () => {
        const browser = await puppeteer.launch({ headless: 'new' })
        const svg = await readFileAsync(file, 'utf8')

        await convertFrameSVGToWebp(browser, svg, {
          path: context.outputFile,
          clip: DROP_SHADOW_FRAME_CLIP
        })
        await browser.close()
      })
    )
  }

  await orchestrator.processCommandBlocks(commandBlocks)
}
