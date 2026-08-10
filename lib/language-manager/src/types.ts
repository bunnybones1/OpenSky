import type * as cardMeta from '../locales/en/cardMeta.json'
import type * as cards from '../locales/en/cards.json'
import type * as common from '../locales/en/common.json'
import type * as tutorial from '../locales/en/tutorial.json'
import type * as vocab from '../locales/en/vocab.json'

export type CommonI18nResources = {
  cardMeta: typeof cardMeta
  vocab: typeof vocab
  cards: typeof cards
  common: typeof common
  tutorial: typeof tutorial
}

export const commonI18nNamespaces = [
  'cardMeta',
  'cards',
  'vocab',
  'common'
] as const satisfies ReadonlyArray<keyof CommonI18nResources>

export const tutorialI18nNamespaces = ['tutorial'] as const

export type Dot<
  T extends string,
  U extends string,
  D extends string = '.'
> = '' extends U ? T : `${T}${D}${U}`

export type PathsToProps<T, V, D extends string = ':'> = T extends V
  ? ''
  : {
      [K in Extract<keyof T, string>]: Dot<K, PathsToProps<T[K], V, '.'>, D>
    }[Extract<keyof T, string>]

export type MergeBy<T, K> = Omit<T, keyof K> & K
export type Singularize<T extends string> =
  T extends `${infer U}_${MagicPluralSuffix}` ? U : T

type MagicPluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
