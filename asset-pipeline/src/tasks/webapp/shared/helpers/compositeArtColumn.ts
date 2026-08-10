import cheerio from 'cheerio'
import { readFileSync } from 'fs'
import * as path from 'path'
import puppeteer, { ScreenshotOptions } from 'puppeteer'

import { artPath } from '../../../../config'
import { readFileAsync } from '../../../../framework/utils'

let artColumnSVG: string = ''

const getArtColumnSVG = () => {
  if (!artColumnSVG) {
    artColumnSVG = readFileSync(
      path.join(artPath, 'webapp/card-composite/art-column.svg'),
      'utf-8'
    )
  }

  return artColumnSVG
}

const compositeArtColumn = async (
  srcArtPath: string,
  srcBackgroundPath: string | undefined,
  destPath: string
) => {
  const unitArtBase64 = await readFileAsync(srcArtPath, 'base64')

  const browser = await puppeteer.launch({ headless: 'new' })
  const $ = cheerio.load(getArtColumnSVG(), { xmlMode: true })

  $('#art').attr('xlink:href', `data:image/png;base64,${unitArtBase64}`)

  if (!!srcBackgroundPath) {
    const backgroundBase64 = await readFileAsync(srcBackgroundPath, 'base64')
    $('#background').attr(
      'xlink:href',
      `data:image/png;base64,${backgroundBase64}`
    )
  } else {
    $('#art').attr('x', '-25%').attr('y', '-25%').attr('height', '125%')
  }

  const options: ScreenshotOptions = {
    path: destPath,
    type: 'webp',
    clip: {
      x: 0,
      y: 0,
      width: 553,
      height: 850
    }
  }

  const page = await browser.newPage()

  page.setContent(`
    <html>
        <body style="margin:0px;">${$.html()}</body>
    </html>
  `)

  await page.setViewport({ height: 850, width: 553 })

  await page.screenshot({
    omitBackground: true,
    ...options
  })

  await page.close()
  await browser.close()
}

export default compositeArtColumn
