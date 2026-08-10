process.setMaxListeners(0)
import {
  i18nInitNewInstance,
  SupportedLanguage,
  supportedLanguages
} from '@opensky/language-manager'
import {
  getParsedCardDescription,
  joinParsedDescription
} from '@opensky/parse-card-description'
import { BASE_HERO_SKINS, BOT_HERO } from '@opensky/shared/constants'
import {
  HeroSkinLibrary,
  SkyTagTitlesLibrary
} from '@opensky/shared/cosmetics'
import { getHeroAbilityAccentColorData } from '@opensky/shared/heroAbilityAccentColorsLib'
import { BaseCard, CardLibrary, Type } from '@skyweaver/state-metadata'
import cors from 'cors'
import * as crypto from 'crypto'
import express from 'express'
import { readFile } from 'fs/promises'
import { Server } from 'http'
import * as path from 'path'
import { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

import {
  artPath,
  assetsPath,
  gameAssetsPath,
  scratchAssetsPath
} from '../../config'
import CommandBlock from '../../framework/CommandBlock'
import { CommandBlockProcessor } from '../../framework/Orchestrator'
import { delay, ensureFolder, writeFileAsync } from '../../framework/utils'
import compositeTitleFrame from '../helpers/compositeTitleFrame'
import { composeImageCommand } from '../helpers/compositeUnitRow'
import { getRenderAffectingCardPropsString } from '../helpers/renderableCardProps'

const PUPPETEER_TIMEOUT = 20 * 60 * 1000

export {
  copyFontFiles,
  createFixedFonts,
  createFontTextures,
  createIndividualFontLanguageCharsets,
  createLanguageFileCharsets
} from './sub-tasks/fonts'
export { processThumbnailArt } from './sub-tasks/processThumbnailArt'

export async function flattenRowUnitArt(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  task.output = 'Flattening row unit art...'

  const cardArtRowScratchPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/art-rows')
  )

  const commandBlocks: CommandBlock[] = []
  const registry = new Map<string, string[]>()

  for (const cardID of CardLibrary.keys()) {
    const card = CardLibrary.get(cardID)!
    if (card.type === 'unit') {
      const inputs = [
        path.join(artPath, `cards/art-rows/bgs/${card.backgroundArtSlug}.png`),
        path.join(artPath, `cards/art-rows/units/${card.artSlug}.png`)
      ]
      const output = path.join(
        cardArtRowScratchPath,
        `units/${card.artSlug}.png`
      )
      if (registry.has(output)) {
        if (inputs.join() === registry.get(output)!.join()) {
          continue
        } else {
          throw new Error(
            `Cannot make art row ${output} from ${inputs}! Already made from ${registry.get(
              output
            )}`
          )
        }
      } else {
        registry.set(output, inputs)
      }
      const context = CommandBlock.createContext(inputs, output)
      commandBlocks.push(
        new CommandBlock(
          context,
          composeImageCommand(context.inputFiles, context.outputFile)
        )
      )
    }
  }

  const herosWithBot = [
    ...Object.values(BASE_HERO_SKINS),
    ...new Set(HeroSkinLibrary.values()),
    BOT_HERO
  ]

  for (const hero of herosWithBot) {
    const context = CommandBlock.createContext(
      [
        path.join(artPath, `cards/art-rows/bgs/${hero.bgID}.png`),
        path.join(artPath, `cards/art-rows/heroes/${hero.artID}.png`)
      ],
      path.join(cardArtRowScratchPath, `heroes/${hero.artID}.png`)
    )
    commandBlocks.push(
      new CommandBlock(
        context,
        composeImageCommand(context.inputFiles, context.outputFile)
      )
    )
  }

  await orchestrator.processCommandBlocks(commandBlocks)
}

export async function createFullCards(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const scratchFullCardsPath = await ensureFolder(
    path.join(scratchAssetsPath, 'cards/full-cards')
  )
  task.output = 'Creating cards... (awaiting vite)'
  const vite = await import('vite')
  task.output = 'initing jobs...'

  const port = 9999
  const compositeUrl = `http://localhost:${port}/game/src/compositor`

  let browser: Browser | undefined
  let compositeServer:
    | Awaited<ReturnType<(typeof vite)['createServer']>>
    | undefined
  let assetsServer: Server | undefined
  const puppet: { page: Page } = {
    page: {} as any
  }

  const commandBlocks: CommandBlock[] = []

  const frameStyles = ['base', 'silver', 'gold', 'none'] as const

  const frameStyleExtMap: {
    [frameStyle in (typeof frameStyles)[number]]: string
  } = {
    base: '',
    silver: '-silver',
    gold: '-gold',
    none: '-locked'
  }

  const cardArtTypes: { [K in Type]: 'unit' | 'spell' } = {
    hero: 'unit',
    unit: 'unit',
    spell: 'spell',
    enchant: 'spell',
    heroAbility: 'spell'
  }

  task.output = 'initing cards...'

  const cards = [...CardLibrary].sort(([a], [b]) => Number(a) - Number(b))
  for (const language of supportedLanguages) {
    const t = await i18nInitNewInstance({
      lng: language,
      defaultNS: 'translation',
      version: '',
      parseMissingKeyHandler: (key, defaultVal) => {
        if (defaultVal) {
          return defaultVal
        }
        throw new Error(`Tried to get translation for non-existing key ${key}`)
      }
    })

    const langFontCharsetFilePath = path.resolve(
      scratchAssetsPath,
      `fonts/charsets/${language}/Barlow-SemiBold.txt`
    )

    const charset = [...(await readFile(langFontCharsetFilePath, 'utf8'))]

    for (const [id, card] of cards) {
      const cardDesc = t(`cards:${id}.description`)
      if (typeof cardDesc !== 'string') {
        throw new Error(
          `missing lang data for card ${id} in language ${language}`
        )
      }
      const joinedDesc = joinParsedDescription(
        getParsedCardDescription(
          cardDesc,
          (id) => t(`cards:${`${id}` as BaseCard}.name`),
          t
        )
      )

      for (const char of joinedDesc) {
        if (!charset.includes(char)) {
          throw new Error(
            `While rendering card ${id} in language ${language}, the character '${char}' is not in the charset.`
          )
        }
      }
      const { artSlug, backgroundArtSlug, attachment, type } = card

      const actualBackgroundAssetPath = path.join(
        gameAssetsPath,
        `cards/art-full/bgs/`,
        type === 'heroAbility'
          ? `${artSlug}-blurred.png`
          : `${backgroundArtSlug}.png`
      )

      if (cardArtTypes[type] === undefined) {
        throw new Error(
          'Missing card art type for  ' +
            type +
            ':' +
            JSON.stringify({ cardArtTypes })
        )
      }

      const inputPaths = [
        actualBackgroundAssetPath,
        path.join(
          gameAssetsPath,
          `cards/art-full/${cardArtTypes[type]}s/${artSlug}.png`
        )
      ]

      if (attachment) {
        if (!CardLibrary.get(attachment)) {
          throw new Error(`No attachment for ${id}`)
        }
        inputPaths.push(
          path.join(
            gameAssetsPath,
            `cards/art-full/spells/${CardLibrary.get(attachment)!.artSlug}.png`
          )
        )
      }

      const inputHashString =
        joinedDesc + (await getRenderAffectingCardPropsString(id, t))

      const extra: any = {
        cardDataHash: crypto
          .createHash('md5')
          .update(inputHashString)
          .digest('hex')
      }
      if (type === 'heroAbility') {
        extra.version = 1
        extra.accentColor = getHeroAbilityAccentColorData(id)
      }

      for (const frameStyle of frameStyles) {
        const filename = `${id}${frameStyleExtMap[frameStyle]}.png`
        const context = CommandBlock.createContext(
          inputPaths,
          path.join(scratchFullCardsPath, `/${language}/`, filename),
          extra
        )

        commandBlocks.push(
          new CommandBlock(context, async () => {
            await initRenderer()
            await ensureLanguage(language)
            await puppet.page.goto(
              `${compositeUrl}/#card-${id}-${frameStyle}-${language}`,
              {
                waitUntil: 'networkidle0',
                timeout: PUPPETEER_TIMEOUT
              }
            )
            await delay(50)

            const dataUrl: string = await puppet.page.evaluate((cardId) => {
              // @ts-ignore
              return window.exportCanvasData()
            }, String(id))

            const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)

            if (!matches || matches.length !== 3) {
              throw new Error('Could not parse data URL.')
            }

            const buffer = Buffer.from(matches[2], 'base64')

            await writeFileAsync(context.outputFile, buffer, 'base64')
            await context.calculateOutputHashes()
          })
        )
      }
    }
  }

  task.output = 'initing heroes...'

  const heroes = [
    ...Object.values(BASE_HERO_SKINS).map(
      (v) => ({ ...v, type: 'base' }) as const
    ),
    ...[...new Set(HeroSkinLibrary.values())].map(
      (v) =>
        ({
          ...v,
          type: 'skin'
        }) as const
    )
  ]

  task.output = 'initing hero skins...'

  for (const heroSkin of heroes) {
    const { id, artID, bgID, hero, type } = heroSkin

    const inputPaths: string[] = []
    inputPaths.push(path.join(gameAssetsPath, `cards/art-full/bgs/${bgID}.png`))
    inputPaths.push(
      path.join(gameAssetsPath, `cards/art-full/heroes/${artID}.png`)
    )

    const inputHashString = JSON.stringify({ ...heroSkin, flavorText: '' })

    const extra = {
      cardDataHash: crypto
        .createHash('md5')
        .update(inputHashString)
        .digest('hex')
    }
    const filename = `${artID}.png`
    const context = CommandBlock.createContext(
      inputPaths,
      path.join(scratchFullCardsPath, filename),
      extra
    )
    commandBlocks.push(
      new CommandBlock(context, async () => {
        await initRenderer()
        await ensureLanguage('en')
        await puppet.page.goto(
          `${compositeUrl}/#hero-${type === 'base' ? hero : id}`,
          {
            waitUntil: 'networkidle0',
            timeout: PUPPETEER_TIMEOUT
          }
        )

        await delay(50)

        const dataUrl: string = await puppet.page.evaluate((cardId) => {
          // @ts-ignore
          return window.exportCanvasData()
        }, String(id))

        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)

        if (!matches || matches.length !== 3) {
          throw new Error('Could not parse data URL.')
        }

        const _mime = matches[1]
        void _mime
        const buffer = Buffer.from(matches[2], 'base64')

        await writeFileAsync(context.outputFile, buffer, 'base64')
        await context.calculateOutputHashes()
      })
    )
  }

  task.output = `preparing ${commandBlocks.length} possible jobs.`

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 1000)
  })

  async function ensureLanguage(language: SupportedLanguage) {
    const currLang = await puppet.page.evaluate(
      () => (window as any).openskyLang
    )
    if (currLang != language) {
      await puppet.page.reload()
      await puppet.page.evaluate(`window.openskyLang = "${language}"`)
    }
  }

  let rendererInitd = false
  async function initRenderer() {
    if (rendererInitd) {
      return
    }
    rendererInitd = true

    compositeServer = await vite.createServer({
      configFile: path.join(__dirname, '../../../../game/vite.config.mts'),
      server: {
        port
      },
      root: path.join(__dirname, '../../../../game/')
    })

    task.output = 'Starting server...'
    await compositeServer.listen()

    task.output = 'Starting asset server...'

    // Express HTTP Assets Server
    const app = express()
    app.use(cors())
    app.use(express.static(assetsPath))

    assetsServer = app.listen(4001, 'localhost')
    assetsServer!.on('error', (err) => {
      console.log(err)
    })

    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 553,
        height: 850,
        deviceScaleFactor: 2
      },
      timeout: PUPPETEER_TIMEOUT
    })
    task.output = 'Navigating to page...' + compositeUrl

    const [page] = await browser.pages()
    puppet.page = page
    await page.goto(`${compositeUrl}/`, {
      waitUntil: 'networkidle0',
      timeout: PUPPETEER_TIMEOUT
    })
    task.output = 'Waiting for canvas..'

    await page.waitForSelector('canvas', { timeout: PUPPETEER_TIMEOUT })

    task.output = 'Warming up assets...'

    for (let i = 0; i < 1; i++) {
      for (const id of [1]) {
        await puppet.page.goto(`${compositeUrl}/#card-${id}-gold`, {
          waitUntil: 'networkidle0',
          timeout: PUPPETEER_TIMEOUT
        })
        await puppet.page.goto(`${compositeUrl}/#card-${id}-silver`, {
          waitUntil: 'networkidle0',
          timeout: PUPPETEER_TIMEOUT
        })
        await puppet.page.goto(`${compositeUrl}/#card-${id}`, {
          waitUntil: 'networkidle0',
          timeout: PUPPETEER_TIMEOUT
        })

        await puppet.page.evaluate((cardId) => {
          // @ts-ignore
          return window.exportCanvasData()
        }, String(id))
      }
    }
  }

  await orchestrator.processCommandBlocks(commandBlocks, undefined, {
    maxProcesses: 1
  })

  if (browser) {
    await browser.close()
  }
  if (compositeServer) {
    compositeServer.close()
  }
  if (assetsServer) {
    assetsServer.close()
  }
}

export const processTitleFrames = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const scratchTitlesPath = await ensureFolder(
    path.join(scratchAssetsPath, 'titles')
  )

  const commandBlocks: CommandBlock[] = []

  const uniqueTitles = new Set()

  for (const titleId of SkyTagTitlesLibrary.keys()) {
    const title = SkyTagTitlesLibrary.get(titleId)

    if (!!title && !uniqueTitles.has(title.asset)) {
      uniqueTitles.add(title.asset)
      const srcPath = path.join(artPath, `titles/${title.asset}.png`)

      const context = CommandBlock.createContext(
        [srcPath],
        path.join(scratchTitlesPath, `/${title.asset}.png`)
      )

      commandBlocks.push(
        new CommandBlock(context, async () => {
          await compositeTitleFrame(context.inputFiles[0], context.outputFile)
        })
      )
    }
  }
  await orchestrator.processCommandBlocks(commandBlocks)
}
