import i, { FormatFunction, Module, Newable, NewableModule } from 'i18next'
import I18NextChainedBackend, {
  ChainedBackendOptions
} from 'i18next-chained-backend'
//@ts-ignore
import HttpApi, { HttpBackendOptions } from 'i18next-http-backend'
import { languageFiles } from './languageFiles'
export * from './languageFiles'

import {
  CommonI18nResources,
  commonI18nNamespaces,
  tutorialI18nNamespaces,
  PathsToProps,
  MergeBy,
  Singularize
} from './types'

export type { CommonI18nResources }
export { commonI18nNamespaces, tutorialI18nNamespaces }

// All supported languages must abide by the format of en.
export const supportedLanguages = [
  'pig',
  'en',
  'fr',
  'es-ES',
  'pt-BR',
  'zh'
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(lang)
}

export const enabledLanguages = [
  'pig',
  'en',
  'pt-BR'
] as const satisfies ReadonlyArray<SupportedLanguage>

export type EnabledLanguage = (typeof enabledLanguages)[number]
export function isEnabledLanguage(lang: string): lang is EnabledLanguage {
  return (enabledLanguages as readonly string[]).includes(lang)
}

export const multiLangIsRolledOut = enabledLanguages.some(
  l => l !== 'en' && l !== 'pig'
)

/**
  We have to hardcode these, because we don't want to load every language file
  just to get the name of that language for the dropdown.
*/
export const LANG_NAMES: { [K in SupportedLanguage]: string } = {
  en: 'English',
  fr: 'Français',
  pig: 'Igpay Atinlay',
  'es-ES': 'Español (Castellano)',
  'pt-BR': 'Português (Brasileiro)',
  zh: '中文'
}

export const LOCALE_LOCAL_STORAGE_KEY = 'opensky-card-lang'

/**
 * Examples:
 *
 * "asdf" -> "Asdf"
 *
 * "ASDF" -> "Asdf"
 *
 * "aSdF" -> "Asdf"
 *
 * "AsDf" -> "Asdf"
 *
 * @param string a string to title-case
 * @returns the same string title-cased
 */

export interface DefaultTypeOptions {
  defaultNS: never
  resources: CommonI18nResources
}
export interface CustomTypeOptions {}

export type TypeOptions = MergeBy<DefaultTypeOptions, CustomTypeOptions>

export type TFuncKey<
  D extends
    keyof TypeOptions['resources'] = TypeOptions['defaultNS'] extends keyof TypeOptions['resources']
    ? TypeOptions['defaultNS']
    : never
> = Singularize<
  | PathsToProps<TypeOptions['resources'], string>
  | (D extends string
      ? PathsToProps<TypeOptions['resources'][D], string, '.'>
      : never)
>

export type TFunction = (path: TFuncKey, context?: object | string) => string

export function i18nInitNewInstance(opts: {
  defaultNS: TypeOptions['defaultNS'] extends never
    ? 'translation'
    : TypeOptions['defaultNS']
  lng?: SupportedLanguage
  use?: ReadonlyArray<Module | NewableModule<Module> | Newable<Module>>
  extraNS?: ReadonlyArray<string>
  resources?: {
    [K in SupportedLanguage]: CommonI18nResources
  }
  version: string
  parseMissingKeyHandler: (missingKey: string, defaultVal?: string) => string
}): Promise<TFunction> {
  return i18nInit(opts, i18n.createInstance())
}

export function i18nInit(
  {
    defaultNS,
    use,
    lng,
    extraNS,
    backends,
    format,
    version,
    parseMissingKeyHandler
  }: {
    defaultNS: 'webapp' | 'game' | 'translation'
    lng?: SupportedLanguage
    use?: ReadonlyArray<Module | NewableModule<Module> | Newable<Module>>
    backends?: ReadonlyArray<Module | NewableModule<Module> | Newable<Module>>
    extraNS?: ReadonlyArray<string>
    format?: FormatFunction
    version: string
    parseMissingKeyHandler?: (missingKey: string, defaultVal?: string) => string
  },
  it = i
) {
  it.use(I18NextChainedBackend)
  for (const u of use ?? []) {
    it.use(u)
  }
  return it.init<ChainedBackendOptions>({
    lng,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
      format
    },
    load: 'currentOnly',
    parseMissingKeyHandler,
    defaultNS,
    ns: [defaultNS, ...commonI18nNamespaces, ...(extraNS ?? [])],
    resources:
      (globalThis as any).process?.release?.name === 'node'
        ? (() => {
            // load from nodejs!
            //@ts-ignore
            const path = require('path')
            //@ts-ignore
            const fs = require('fs')
            return Object.fromEntries(
              supportedLanguages
                .map(lang => {
                  const languageFilePaths = languageFiles(lang).map(ps =>
                    path.join(...ps)
                  )
                  return [lang, languageFilePaths] as const
                })
                .map(([lang, languageFiles]) => {
                  const namespacesList = languageFiles.map(languageFile => {
                    const namespace = languageFile
                      .split('/')
                      .pop()
                      .split('.json')
                      .shift()
                    const namespaceContents = JSON.parse(
                      fs.readFileSync(languageFile).toString()
                    )
                    return [namespace, namespaceContents]
                  })
                  const namespaces = Object.fromEntries(namespacesList)
                  return [lang, namespaces]
                })
            )
          })()
        : undefined,
    backend: {
      backends: [...(backends ?? []), HttpApi],
      backendOptions: [
        ...Array.from(backends ?? [], () => ({})),
        {
          loadPath: (lngs, namespaces) =>
            `/locales/${version || 'dev'}/${lngs[0]}/${namespaces[0]}.json`,
          queryStringParams: { v: version ?? '' }
        } satisfies HttpBackendOptions
      ]
    }
  })
}

export const i18n = i as Omit<typeof i, 't'> & { t: TFunction }

type CardLangKey = keyof CommonI18nResources['cards']
type VocabLangKey = keyof CommonI18nResources['vocab']
export const translate = {
  card: {
    name: function cardName(cardID: CardLangKey): string {
      return i18n.t(`cards:${cardID}.name`) ?? cardID
    },
    description: function cardDescription(cardID: CardLangKey): string {
      return i18n.t(`cards:${cardID}.description`) ?? ''
    },
    flavorText: function cardFlavorText(cardID: CardLangKey): string {
      return i18n.t(`cards:${cardID}.flavorText`) ?? ''
    }
  },
  vocab: {
    text: function vocabText(vocab: VocabLangKey): string {
      return i18n.t(`vocab:${vocab}.text`) ?? ''
    },
    title: function vocabTitle(vocab: VocabLangKey): string {
      return i18n.t(`vocab:${vocab}.title`) ?? ''
    }
  }
}
