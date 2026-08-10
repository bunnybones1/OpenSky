import { TFunction } from '@opensky/language-manager'

type Element =
  | 'light'
  | 'dark'
  | 'water'
  | 'earth'
  | 'fire'
  | 'mind'
  | 'air'
  | 'metal'
type ElementText = Capitalize<Element>
type Trait =
  | 'Stealth'
  | 'Wither'
  | 'Guard'
  | 'Banner'
  | 'Lifesteal'
  | 'Armor'
  | 'Dash'

export type CardDescriptionTokenType =
  | 'bold'
  | 'normal'
  | 'buff'
  | 'multistat'
  | 'card'
  | 'mana'
  | 'trigger'
  | 'element'
  | 'triggerElement'
  | 'explainer'
  | 'globalEffectDelimiter'

export type CardDescriptionToken = { value: { text: string } } & (
  | {
      type: 'normal' | 'explainer' | 'globalEffectDelimiter'
    }
  | {
      type: 'bold'
      value: { boldable: ExpectedBoldable }
    }
  | {
      type: 'buff'
      value: {
        direction: Direction
        value: MaybeXValue
        field: 'hp' | 'dmg' | 'pow'
      }
    }
  | {
      type: 'multistat'
      value: {
        powDirection: Direction
        hpDirection: Direction
      }
    }
  | {
      type: 'card'
      value: {
        cardId: string
      }
    }
  | { type: 'mana' }
  | { type: 'trigger'; value: { kind: string; isAura?: boolean } }
  | {
      type: 'element'
      value: {
        element: Element
      }
    }
  | {
      type: 'triggerElement'
      value: {
        element: Element
      }
    }
  | {
      type: 'trait'
      value: {
        trait: Trait
      }
    }
)

const SEP_TOKEN = '@'

const expectedBoldables = [
  'random',
  'summon',
  'summons',
  'draw',
  'draws',
  'mulligan',
  'dust',
  'trait',
  'traits',
  'enemyconjure',
  'enemydraw',
  'conjure',
  'enchanted',
  'sleep',
  'sleeping',
  'ready',
  'inspire',
  'death',
  'glory',
  'play',
  'sunrise',
  'sunset',
  'enchant',
  'enchants',
  'rune',
  'lowesthealth',
  'shroom',
  'wisp',
  'scion',
  'arms',
  'blade'
] as const
export type ExpectedBoldable = (typeof expectedBoldables)[number]

export function isExpectedBoldable(str: string): str is ExpectedBoldable {
  return (expectedBoldables as readonly string[]).includes(str)
}

type MaybeXValue = `${number}` | 'X'
type Direction = '-' | '+' | ''

type CardTokenProcessor<U = CardDescriptionToken> =
  U extends CardDescriptionToken
    ? {
        pattern: RegExp
        type: U['type']
        parseRegexResultIntoToken: (
          // we have to any because we're basically typing the regex result.
          // we could instead use a fancy library that strongly-types regexes,
          // but that's a lot of work for little gain.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: any,
          getCardName: (cardId: string) => string,
          getTranslation: TFunction
        ) => U['value']
      }
    : never

const CARD_TOKEN_RE = [
  {
    pattern: /~/g,
    type: 'globalEffectDelimiter',
    parseRegexResultIntoToken: () => ({ text: '' })
  },
  {
    pattern: /\{(?<type>trigger|aura)(:(?<text>.+?))?\}/g,
    type: 'trigger',
    parseRegexResultIntoToken: (
      value:
        | {
            text?: string
            type?: 'trigger' | 'aura'
          }
        | undefined,
      _,
      t
    ) => {
      if (!value?.text) {
        return {
          kind: '',
          text: '',
          isAura: value?.type === 'aura'
        }
      }
      const translated = value.text
        .split(/(\s|&|:)/g)
        .map(s => {
          if (s.length < 3) {
            return s
          }
          const val = t(`cardMeta:triggers.${s as 'Death'}`, {
            defaultValue: s
          })
          if (typeof val === 'string') {
            return val
          } else {
            return s
          }
        })
        .join('')
      return {
        kind: value.text,
        text: translated,
        isAura: value.type === 'aura'
      }
    }
  },
  {
    pattern:
      /\{triggerElement:(?<element>Light|Dark|Water|Earth|Fire|Mind|Air|Metal)\}/g,
    type: 'triggerElement',
    parseRegexResultIntoToken: (
      value: undefined | { element: ElementText },
      _,
      t
    ) => {
      if (!value) {
        throw new Error('Missing trigger element.')
      }
      return {
        text: t(`cardMeta:elements.titleCase.${lowercase(value.element)}`),
        element: lowercase(value.element)
      }
    }
  },
  {
    pattern: /\{(?<element>Light|Dark|Water|Earth|Fire|Mind|Air|Metal)\}/g,
    type: 'element',
    parseRegexResultIntoToken: (value: { element: ElementText }, _, t) => ({
      text: t(`cardMeta:elements.titleCase.${lowercase(value.element)}`),
      element: lowercase(value.element)
    })
  },
  {
    pattern: /\{(?<trait>Stealth|Wither|Guard|Banner|Lifesteal|Armor|Dash)\}/g,
    type: 'trait',
    parseRegexResultIntoToken: (value: { trait: Trait }, _, t) => ({
      text: t(`cardMeta:traits.titleCase.${lowercase(value.trait)}`),
      trait: value.trait
    })
  },
  {
    pattern: /{(?<direction>-|\+|)(?<value>\d+|X)*?(?<field>hp|pow|dmg)}/g,
    type: 'buff',
    parseRegexResultIntoToken: (
      {
        direction,
        value,
        field
      }: {
        direction: Direction
        value: MaybeXValue
        field: 'hp' | 'pow' | 'dmg'
      },
      _,
      t
    ) => {
      return {
        direction,
        value,
        field,
        text: t(`cardMeta:buff.${field}`, { amount: `${direction}${value}` })
      }
    }
  },
  {
    pattern: /(?<text>\(.+?\))/g,
    type: 'explainer',
    parseRegexResultIntoToken: ({ text }: { text: string }) => ({ text })
  },
  {
    pattern:
      /\{(?<powDirection>-|\+|)(?<powValue>\d|X)\/(?<hpDirection>-|\+|)(?<hpValue>\d|X)\}/g,
    type: 'multistat',
    parseRegexResultIntoToken: ({
      powDirection,
      hpDirection,
      hpValue,
      powValue
    }: {
      powDirection: Direction
      powValue: MaybeXValue
      hpDirection: Direction
      hpValue: MaybeXValue
    }) => {
      return {
        powDirection,
        hpDirection,
        text: `${powDirection}${powValue}/${hpDirection}${hpValue}`
      }
    }
  },
  {
    pattern: /{card:(?<cardId>\d+)\}/g,
    type: 'card',
    parseRegexResultIntoToken: (
      { cardId }: { cardId: `${number}` },
      getCardName
    ) => ({ cardId, text: getCardName(cardId) })
  },
  {
    pattern: /\{(?<direction>-|\+|)(?<mana>\d+|X*)(?<identifier>[cm])\}/g,
    type: 'mana',
    parseRegexResultIntoToken: (
      {
        direction,
        mana,
        identifier
      }: { direction: Direction; mana: MaybeXValue; identifier: 'c' | 'm' },
      _,
      t
    ) => ({
      text: t(`cardMeta:mana.${identifier}`, { amount: `${direction}${mana}` })
    })
  },
  {
    pattern: /{(?<keyword>\w*?)(\|(?<translation>\w*))?}/gi,
    type: 'bold',
    parseRegexResultIntoToken: (
      { keyword, translation }: { keyword: string; translation?: string },
      _,
      t
    ) => {
      const lowered = lowercase(keyword)

      if (!isExpectedBoldable(lowered)) {
        throw new Error(`Invalid boldable ${lowered} in card!`)
      }
      const translatedText =
        translation ??
        matchCase(keyword, t(`cardMeta:keyword.lowerCase.${lowered}`))
      return { text: translatedText, boldable: lowered }
    }
  }
] as const satisfies ReadonlyArray<CardTokenProcessor>

const isNotEmptyNormalTextToken = (token: CardDescriptionToken) =>
  token &&
  'text' in token.value &&
  (token.type !== 'normal' || !!token.value.text)

const replaceStringAtIndicies = (
  str: string,
  startIndex: number,
  endIndex: number,
  replaceString: string
) => {
  return str.replace(str.substring(startIndex, endIndex), replaceString)
}

function insertIntoArray<T>(arr: T[], value: T[], index: number): T[] {
  return [...arr.slice(0, index), ...value, ...arr.slice(index)]
}

export function getParsedCardDescription(
  cardDescription: string,
  getCardName: (cardId: string) => string,
  t: TFunction
): CardDescriptionToken[] {
  if (!cardDescription) {
    return []
  }

  let expandedCardDescription = [...cardDescription]
  for (let iter = 0; iter < expandedCardDescription.length; iter++) {
    if (expandedCardDescription[iter] === '{') {
      let index = iter + 1

      while (index < expandedCardDescription.length) {
        if (expandedCardDescription[index] === '}') {
          break
        }
        if (expandedCardDescription[index] === '{') {
          const enclosedEndIndex = expandedCardDescription
            .slice(index + 1)
            .findIndex(char => char === '}')

          const enclosedContent = expandedCardDescription
            .slice(index + 1, index + 1 + enclosedEndIndex)
            .join('')

          let enclosedContentType = 'triggerElement'

          const manaTokenType = CARD_TOKEN_RE.find(
            ({ type }) => type === 'mana'
          )

          if (manaTokenType) {
            const matches = manaTokenType.pattern.test(`{${enclosedContent}}`)
            if (matches) {
              enclosedContentType = 'mana'
            }
          }

          let closingIndex = index + 1

          while (closingIndex < expandedCardDescription.length) {
            if (expandedCardDescription[closingIndex] === '}') {
              expandedCardDescription = insertIntoArray(
                expandedCardDescription,
                ['}'],
                index
              )

              if (enclosedContentType === 'triggerElement') {
                expandedCardDescription = insertIntoArray(
                  expandedCardDescription,
                  [`triggerElement:`],
                  index + 2
                )
              } else if (enclosedContentType === 'mana') {
                expandedCardDescription = insertIntoArray(
                  expandedCardDescription,
                  [' '],
                  closingIndex + 3
                )
              }

              if (expandedCardDescription[closingIndex + 3] !== '}') {
                let index = closingIndex + 2
                if (enclosedContentType === 'triggerElement') {
                  index = closingIndex + 3
                }
                if (enclosedContentType === 'multiTriggers') {
                  const segments = enclosedContent.split('&')
                  for (let i = 0; i < segments.length; i++) {
                    expandedCardDescription = insertIntoArray(
                      expandedCardDescription,
                      ['{trigger:'],
                      index
                    )
                  }
                  expandedCardDescription = insertIntoArray(
                    expandedCardDescription,
                    ['{trigger:'],
                    index
                  )
                }
                expandedCardDescription = insertIntoArray(
                  expandedCardDescription,
                  ['{trigger:'],
                  index
                )
              } else {
                expandedCardDescription.splice(closingIndex + 2, 1)
              }
              break
            }

            closingIndex++
          }
          iter++

          break
        }

        index++
      }
    }
  }
  cardDescription = expandedCardDescription.join('')

  const tokens: {
    token: CardDescriptionToken
    startIndex: number
    endIndex: number
  }[] = []

  CARD_TOKEN_RE.forEach(({ pattern, type, parseRegexResultIntoToken }) => {
    let matches: RegExpExecArray | null = null

    while ((matches = pattern.exec(cardDescription))) {
      const value = { ...matches.groups }
      let values = [value]
      if (type === 'trigger') {
        if (value.text) {
          values = value.text.split('&').map((value, index, itemsInList) => {
            return {
              text: index === itemsInList.length - 1 ? value : value.concat('&')
            }
          })
        }
      }

      cardDescription = replaceStringAtIndicies(
        cardDescription,
        matches.index,
        matches.index + matches[0].length,
        `${SEP_TOKEN.repeat(matches[0].length - 1)}$`
      )
      for (const value of values) {
        try {
          const parsedVal = parseRegexResultIntoToken(
            // we disable this warnings cuz we're try/catching anyways.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            value as any,
            getCardName,
            t
          )
          tokens.push({
            token: {
              type,
              value: parsedVal
            } as CardDescriptionToken,
            startIndex: matches.index,
            endIndex: matches.index + matches[0].length
          })
        } catch (err) {
          if (err instanceof Error) {
            throw new Error(
              'Failed to parse card \n' +
                cardDescription +
                '\n' +
                err.message +
                '\n' +
                err.stack
            )
          } else {
            throw new Error(
              'Failed to parse card \n' +
                cardDescription +
                '\n' +
                JSON.stringify(err)
            )
          }
        }
        const i = values.indexOf(value)
        if (i != 0) {
          cardDescription = replaceStringAtIndicies(
            cardDescription,
            i,
            i + 1,
            '$'
          )
        }
      }
    }
  })

  if (tokens.length === 0) {
    return [
      {
        type: 'normal',
        value: { text: cardDescription }
      }
    ]
  }

  const sortedTokens = tokens.sort((a, b) => {
    return a.endIndex - b.endIndex
  })

  const normalTextTokens = cardDescription
    .replace(/(?:@)*\$/g, '%')
    .split('%')
    .map(
      text =>
        ({
          type: 'normal',
          value: { text }
        }) as const
    )

  const sortedTokensWithNormalText = tokens
    .map(({ token }) => token)
    .reduce((tokens, token, index) => {
      return tokens.concat(normalTextTokens[index], token)
    }, [] as CardDescriptionToken[])
    .concat(normalTextTokens.slice(sortedTokens.length))
    .filter(isNotEmptyNormalTextToken)
  return sortedTokensWithNormalText
}
export const getGlobalEffectDescription = (
  cardDescription: CardDescriptionToken[],
  firstLetter: 'lowercase' | 'uppercase'
): CardDescriptionToken[] => {
  // Slay: ~your x have +1/+1 this game.~
  const splitTokens = splitArray(
    cardDescription,
    t => t.type === 'globalEffectDelimiter'
  )
  const globalEffect = splitTokens[1]
  if (!globalEffect) {
    console.warn(
      'getParsedGlobalEffectDescription had trouble with a missing string'
    )
    return []
  }

  globalEffect[0].value.text =
    globalEffect[0].value.text
      .charAt(0)
      [firstLetter === 'lowercase' ? 'toLowerCase' : 'toUpperCase']() +
    globalEffect[0].value.text.substring(1)
  return globalEffect
}

export const joinParsedDescription = (
  parsedDescription: CardDescriptionToken[] | undefined
) => {
  const placeholder = [
    {
      type: 'normal',
      value: {
        text: `This card is bugged and has no entry in CardMetadataLibrary.`
      }
    }
  ] as CardDescriptionToken[]

  return (parsedDescription || placeholder).reduce<string>((acc, token) => {
    const { value } = token

    if (value.text) {
      acc += `${value.text}`
    }
    return acc
  }, '')
}

export interface CardDescriptionTextSegment {
  text: string
  color: string | number
  fontWeight?: number
  italicSkew?: number
  xOffset?: number
  yOffset?: number
}

export const getTextSegmentsFromDescription = (
  description: CardDescriptionToken[]
): CardDescriptionTextSegment[] => {
  const segments: CardDescriptionTextSegment[] = []

  description.forEach(chunk => {
    const { type, value } = chunk

    const { text } = value

    const segment: CardDescriptionTextSegment = {
      text: String(text),
      fontWeight: 1.0,
      italicSkew: 0.0,
      color:
        type in descriptionTokenColors
          ? descriptionTokenColors[type as keyof typeof descriptionTokenColors]
          : descriptionTokenColors.normal
    }

    switch (type) {
      case 'bold':
      case 'trait':
        //segment.fontWeight = 1.3
        segment.color = descriptionTokenColors.bold
        break

      case 'trigger':
        segment.fontWeight = 1.3
        break

      case 'triggerElement':
        segment.color =
          descriptionTokenColors[
            chunk.value.element as keyof typeof descriptionTokenColors
          ]
        segment.fontWeight = 1.3
        break

      case 'buff':
        segment.color =
          value.direction === '-' || value.field === 'dmg'
            ? descriptionTokenColors.damage
            : value.direction === '+'
            ? descriptionTokenColors.buff
            : descriptionTokenColors.bold
        if (value.direction === '') {
          segment.fontWeight = 1.3
        }
        break

      case 'multistat': {
        const { powDirection, hpDirection } = value
        if (powDirection === '+' && hpDirection === '+') {
          segment.color = descriptionTokenColors.buff
        } else if (powDirection === '-' && hpDirection === '-') {
          segment.color = descriptionTokenColors.damage
        }
        break
      }

      case 'element':
        segment.color =
          descriptionTokenColors[
            chunk.value.element as keyof typeof descriptionTokenColors
          ]
        break

      case 'explainer':
        segment.italicSkew = 0.2
        break
    }

    segments.push(segment)
  })

  return segments
}

/**
 * Returns either a parsed description
 * or an error message.
 */
export function textSegmentsOrError(
  text: string,
  getCardName: (id: string) => string,
  t: TFunction
): CardDescriptionTextSegment[] & { cardDescriptionParseSuccess: boolean } {
  try {
    const desc = getParsedCardDescription(text, getCardName, t)
    const segments = getTextSegmentsFromDescription(
      desc
    ) as CardDescriptionTextSegment[] & {
      cardDescriptionParseSuccess: boolean
    }
    segments.cardDescriptionParseSuccess = true
    return segments
  } catch (e) {
    const a = [
      {
        text: 'INVALID TEXT',
        color: 'red'
      }
    ] as CardDescriptionTextSegment[] & {
      cardDescriptionParseSuccess: boolean
    }
    a.cardDescriptionParseSuccess = false
    return a
  }
}

type ColoredTokens = Exclude<
  CardDescriptionTokenType,
  'element' | 'triggerElement'
>

export const descriptionTokenColors = {
  trigger: '#ffffff',
  bold: '#ffffff',
  explainer: '#83839e',
  normal: '#bcbcca',
  card: '#9b80ff',
  multistat: '#ffffff',
  buff: '#7cff86',
  damage: '#ff7c9e',
  mana: '#33fbff',
  dark: '#b18bc5',
  earth: '#32c11e',
  fire: '#fc6464',
  water: '#6299e8',
  light: '#ddbf2a',
  metal: '#b5b58f',
  mind: '#b67ff5',
  air: '#71c6b8',
  globalEffectDelimiter: '#000000'
} as const satisfies {
  readonly [k in ColoredTokens]: string
} & {
  readonly [K in string]: string
}

export type FindByTag<Union, Tag> = Union extends Tag ? Union : never

function titleCase<S extends string>(text: S): Capitalize<S> {
  return (text.charAt(0).toUpperCase() + text.substring(1)) as Capitalize<S>
}
function lowercase<S extends string>(text: S): Lowercase<S> {
  return text.toLowerCase() as Lowercase<S>
}
function uppercase<S extends string>(text: S): Uppercase<S> {
  return text.toUpperCase() as Uppercase<S>
}

function matchCase<M extends string, S extends string>(
  stringToMatch: M,
  stringToModify: S
): FirstChar<M> extends Uppercase<string>
  ? SecondChar<M> extends Uppercase<string>
    ? Uppercase<S>
    : Capitalize<S>
  : Lowercase<S> {
  // This function has to use explicit any cuz these types are BONKED.
  // I at least type-check them as strings, so the `any` is less dangerous.
  if (stringToMatch[0].toUpperCase() === stringToMatch[0]) {
    if (stringToMatch[1].toUpperCase() === stringToMatch[1]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return uppercase(stringToModify) satisfies string as any
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return titleCase(stringToModify) satisfies string as any
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return lowercase(stringToModify) satisfies string as any
  }
}

type FirstChar<T extends string> = T extends `${infer F}${string}` ? F : never
// we don't care about First Char (_F) being unused, but it has to be there for the infer to work.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SecondChar<T extends string> = T extends `${infer _F}${infer S}${string}`
  ? S
  : never

function splitArray<T>(
  arr: Array<T>,
  splitOn: (item: T) => boolean
): Array<Array<T>> {
  return arr.reduce<T[][]>((acc, item) => {
    if (acc.length === 0) {
      acc.push([])
    }
    if (splitOn(item)) {
      acc.push([])
      return acc
    }
    const curr = acc[acc.length - 1]
    curr.push(item)
    return acc
  }, [])
}
