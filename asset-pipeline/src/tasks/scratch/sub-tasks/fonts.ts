import {
  languageFiles,
  SupportedLanguage,
  supportedLanguages
} from '@opensky/language-manager'
import { readFileSync } from 'fs'
import path from 'path'

import { artPath, scratchAssetsPath } from '~/config'
import CommandBlock from '~/framework/CommandBlock'
import { CommandBlockProcessor } from '~/framework/Orchestrator'
import { ensureFolder, globAsync, writeFileAsync } from '~/framework/utils'
import { loadJson } from '~/tasks/helpers/json'

const fontWeights = [
  { weight: 100, name: 'Thin' },
  { weight: 200, name: 'ExtraLight' },
  { weight: 300, name: 'Light' },
  { weight: 400, name: 'Regular' },
  { weight: 500, name: 'Medium' },
  { weight: 600, name: 'SemiBold' },
  { weight: 700, name: 'Bold' },
  { weight: 800, name: 'ExtraBold' },
  { weight: 900, name: 'Black' }
] as const satisfies ReadonlyArray<{ weight: number; name: string }>

const fontWidths = [
  { width: 100, name: '' },
  { width: 50, name: 'Condensed' },
  { width: 75, name: 'SemiCondensed' }
] as const satisfies ReadonlyArray<{ width: number; name: string }>

export async function createFixedFonts(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const configs: Array<{
    variableFontPath: string
    langSuffix?: SupportedLanguage
    outputFontName: string
  }> = [
    {
      variableFontPath: path.resolve(
        artPath,
        'fonts/fallback-variable/NotoSansCJKsc-VF.ttf'
      ),
      langSuffix: 'zh',
      outputFontName: 'NotoSans'
    }
  ]
  const commandBlocks: CommandBlock[] = []

  for (const config of configs) {
    for (const weight of fontWeights) {
      for (const width of fontWidths) {
        // TODO consider also generating italic versions of fonts.
        const lang = config.langSuffix ? `_${config.langSuffix}` : ''
        const fontName = `${config.outputFontName}${width.name}-${weight.name}`
        const outputFile = path.resolve(
          scratchAssetsPath,
          `fonts/ready/fallback/${fontName}${lang}.ttf`
        )
        const context = CommandBlock.createContext(
          [config.variableFontPath],
          [outputFile]
        )
        commandBlocks.push(
          new CommandBlock(
            context,
            `fonttools varLib.mutator ${context.inputFile} wght=${weight.weight} wdth=${width.width} -o ${outputFile} 2>&1`
          )
        )
      }
    }
  }

  await orchestrator.processCommandBlocks(commandBlocks)
}

export async function copyFontFiles(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const artFontPath = path.resolve(artPath, `fonts/fonts`)
  const artFallbackFontPath = path.resolve(artPath, `fonts/fallback`)

  const ttfFiles = await globAsync(path.resolve(artFontPath, '*.ttf'))
  const fallbackTTFFiles = await globAsync(
    path.resolve(artFallbackFontPath, '*.ttf')
  )

  const commandBlocks = [
    ...ttfFiles.map((ttfFile) => {
      const fontName = path.basename(ttfFile, path.extname(ttfFile))
      const context = CommandBlock.createContext(
        [ttfFile],
        [path.resolve(scratchAssetsPath, `fonts/ready/${fontName}.ttf`)]
      )
      task.output = `Copying font files to scratch... ${context.inputFile} -> ${context.outputFile}`
      return new CommandBlock(
        context,
        `cp ${context.inputFile} ${context.outputFile}`
      )
    }),
    ...fallbackTTFFiles.map((ttfFile) => {
      const fontName = path.basename(ttfFile, path.extname(ttfFile))
      const context = CommandBlock.createContext(
        [ttfFile],
        [
          path.resolve(
            scratchAssetsPath,
            `fonts/ready/fallback/${fontName}.ttf`
          )
        ]
      )
      task.output = `Copying fallback font files to scratch... ${context.inputFile} -> ${context.outputFile}`
      return new CommandBlock(
        context,
        `cp ${context.inputFile} ${context.outputFile}`
      )
    })
  ]
  await orchestrator.processCommandBlocks(commandBlocks)
}

export async function createFontTextures(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const fontTextureOutputFolder = path.resolve(
    scratchAssetsPath,
    `fonts/bmfont`
  )

  task.output = `Creating font textures...`

  const scratchFontsPath = path.resolve(scratchAssetsPath, `fonts/ready`)

  const ttfFiles = await globAsync(path.resolve(scratchFontsPath, '*.ttf'))

  const outputExts = ['json', 'png']

  const langCharsetsPath = path.resolve(scratchAssetsPath, `fonts/charsets`)

  const fallbackFontFiles = await globAsync(
    path.resolve(scratchFontsPath, 'fallback/*.ttf')
  )

  const fontProcessCommandBlocks = supportedLanguages.flatMap((lang) =>
    ttfFiles.map((ttfFile) => {
      const fontName = path.basename(ttfFile, path.extname(ttfFile))
      const height = 2048
      const fontRadius = ttfFile.includes('-Shadow') ? 12 : 4
      const charsetFilePath = path.resolve(
        langCharsetsPath,
        `${lang}/${fontName}.txt`
      )
      const fallbackFont = getFallbackFontPath(fallbackFontFiles, ttfFile, lang)
      if (!fallbackFont) {
        throw new Error('No fallback font for ' + ttfFile + ' in ' + lang)
      }
      const context = CommandBlock.createContext(
        [charsetFilePath, ttfFile, ...(fallbackFont ? [fallbackFont] : [])],
        outputExts.map((ext) =>
          path.resolve(fontTextureOutputFolder, `${lang}/${fontName}.${ext}`)
        )
      )
      const fallbackArgs = fallbackFont ? `--fallback ${fallbackFont}` : ''
      task.output = `Processing font files in scratch... ${context.inputFile} -> ${context.outputFile}`
      const outputTextureFolder = path.resolve(
        fontTextureOutputFolder,
        `${lang}/`
      )
      const outputTexturePath = path.resolve(
        outputTextureFolder,
        `${fontName}.png`
      )

      return new CommandBlock(
        context,
        `mkdir -p ${outputTextureFolder}; pnpm exec msdf-bmfont -m 2048,${height} -t msdf --output-type json -s 42 -r ${fontRadius} --smart-size --pot ${fallbackArgs} -i ${charsetFilePath} ${ttfFile} -o ${outputTexturePath}`
      )
    })
  )

  await orchestrator.processCommandBlocks(fontProcessCommandBlocks)
}

const restrictedChars = ['西']
export const createLanguageFileCharsets = async (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => {
  const charsetsFolder = await ensureFolder(
    path.join(scratchAssetsPath, 'charsets')
  )

  const baseCharsetPath = path.resolve(artPath, `fonts/charset.txt`)
  const enLangFiles = [
    baseCharsetPath,
    ...languageFiles('en').map((g) => path.join(...g))
  ]
  const locales = supportedLanguages.map((lang) => ({
    files: languageFiles(lang).map((g) => path.join(...g)),
    lang
  }))

  const commandBlocks = locales.map((locale) => {
    const chars = [
      ...new Set(
        [...enLangFiles, ...locale.files].reduce<Set<string>>(
          (s, f) => (
            [...readFileSync(f).toString()].forEach((c) => s.add(c)), s
          ),
          new Set()
        )
      )
    ]
      .sort()
      .filter((c) => !restrictedChars.includes(c))
    const charsetFile = path.join(charsetsFolder, `/${locale.lang}.txt`)
    const context = CommandBlock.createContext([], charsetFile, chars)

    return new CommandBlock(context, () =>
      writeFileAsync(charsetFile, chars.join(''))
    )
  })

  await orchestrator.processCommandBlocks(commandBlocks)
}

function getFallbackFontPath(
  fallbackFontFiles: string[],
  ttfPath: string,
  lang?: SupportedLanguage
): string | undefined {
  const currentSlug = path
    .basename(ttfPath, '.ttf')
    .replace('-Shadow', '') // TODO REMOVE ME
    .replace(/-/g, '') // normalize where dashes are by removing them
    .replace('Barlow', '')
    .replace('GothicHorizon', '')
    .replace('Roboto', '')
    .replace('Regular', '') // omit "regular" from slugs, since unlablelled = regular

  // First, try to find a language-specific font.
  const langSpecific = fallbackFontFiles.find(
    (f) =>
      lang &&
      `${currentSlug}_${lang.replace(/-/g, '')}` ===
        path
          .basename(f, path.extname(f))
          .replace('NotoSans', '')
          .replace(/-/g, '')
          .replace('Regular', '') // omit "regular" from slugs, since unlablelled = regular
  )
  if (langSpecific) {
    return langSpecific
  } else if (currentSlug === 'Black' && lang === 'zh') {
    console.error(
      currentSlug,
      lang,
      'no specific lang!!',
      JSON.stringify(
        fallbackFontFiles.map((f) =>
          path
            .basename(f, '.ttf')
            .replace('NotoSans', '')
            .replace(/-/g, '')
            .replace('Regular', '')
        )
      )
    )
    process.exit(1)
  }
  // Else, use the default fallback.
  const defaultFallback = fallbackFontFiles.find(
    (f) =>
      currentSlug ===
      path
        .basename(f, '.ttf')
        .replace('NotoSans', '')
        .replace(/-/g, '')
        .replace('Regular', '') // omit "regular" from slugs, since unlablelled = regular
  )
  return defaultFallback
}

export async function createIndividualFontLanguageCharsets(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const fontLanguageCharsetsOutputFolder = path.resolve(
    scratchAssetsPath,
    `fonts/charsets`
  )

  const charsetSuffixes = await loadJson(
    path.resolve(artPath, `fonts/font-charset-suffixes.json`)
  )
  task.output = `Creating font lang charsets...`

  const scratchFontsPath = path.resolve(scratchAssetsPath, `fonts/ready`)

  const ttfFiles = await globAsync(path.resolve(scratchFontsPath, '*.ttf'))

  const charsetsPath = path.resolve(scratchAssetsPath, `charsets`)
  const langCharsetFiles = supportedLanguages.map((lang) => ({
    lang,
    charsetTxtPath: path.resolve(charsetsPath, `${lang}.txt`)
  }))

  const fontProcessCommandBlocks = langCharsetFiles.flatMap(
    ({ lang, charsetTxtPath: localeCharsetFilePath }) =>
      ttfFiles.map((ttfFile) => {
        let suffix = ''
        const fontName = path.basename(ttfFile, path.extname(ttfFile))
        if (fontName in charsetSuffixes) {
          suffix = '-' + charsetSuffixes[fontName]
        }
        const fontSpecificCharsetFilePath = path.resolve(
          artPath,
          `fonts/charset${suffix}.txt`
        )
        const outputDir = path.resolve(
          fontLanguageCharsetsOutputFolder,
          `${lang}`
        )
        const outputFile = path.resolve(outputDir, `./${fontName}.txt`)
        const context = CommandBlock.createContext(
          [fontSpecificCharsetFilePath, localeCharsetFilePath],
          outputFile
        )
        task.output = `Creating font charset... ${context.inputFiles} -> ${context.outputFile}`
        return new CommandBlock(
          context,
          `mkdir -p ${outputDir}; cat ${fontSpecificCharsetFilePath} ${localeCharsetFilePath} > ${outputFile}`
        )
      })
  )

  await orchestrator.processCommandBlocks(fontProcessCommandBlocks)
}
