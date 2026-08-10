import puppeteer, { ScreenshotOptions } from 'puppeteer'

import { readFileAsync } from '../../framework/utils'

const compositeTitleFrame = async (srcFramePath: string, destPath: string) => {
  const frameArtBase64 = await readFileAsync(srcFramePath, 'base64')

  const browser = await puppeteer.launch({ headless: true })

  const page = await browser.newPage()

  const options: ScreenshotOptions = {
    path: destPath,
    clip: {
      x: 0,
      y: 0,
      width: 352 * 2,
      height: 256
    }
  }

  page.setContent(`
    <html>
      <body style="margin:0px;">
        <div style="flex-wrap:nowrap;display:flex;flex-direction:row;align-items:center;justify-content:flex-start">
          <img style="transform:scaleX(-1)" src="data:image/png;base64,${frameArtBase64}" />
          <img src="data:image/png;base64,${frameArtBase64}" />
        </div>
      </body>
    </html>
  `)

  await page.setViewport({ height: 256, width: 352 * 2 })

  await page.screenshot({
    omitBackground: true,
    ...options
  })

  await page.close()
  await browser.close()
}

export default compositeTitleFrame
