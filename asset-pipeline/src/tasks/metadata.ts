import { i18nInitNewInstance } from '@opensky/language-manager'
import {
  CardDescriptionToken,
  getParsedCardDescription
} from '@opensky/parse-card-description'
import { CARD_ARTISTS } from '@opensky/shared/artists'
import { DECKCLASS_PRISMS, HERO_DECKCLASS } from '@opensky/shared/constants'
import {
  cardBackBaseOffset,
  CardBackLibrary,
  crystalBaseOffset,
  CrystalLibrary,
  heroSkinBaseOffset,
  HeroSkinLibrary,
  stickerBaseOffset,
  StickerLibrary
} from '@opensky/shared/cosmetics'
import { BaseCard, CardLibrary, Prism } from '@skyweaver/state-metadata'
import base64url from 'base64url'
import * as crypto from 'crypto'
import * as path from 'path'

import { assetsPath, metadataPath, webappAssetsPath } from '../config'
import CommandBlock from '../framework/CommandBlock'
import FileHashCache from '../framework/FileHashCache'
import { CommandBlockProcessor } from '../framework/Orchestrator'
import { writeFileAsync } from '../framework/utils'
import { getRenderAffectingCardPropsString } from './helpers/renderableCardProps'

const tokenizedFrameTypes = ['silver', 'gold'] as const

const cardIdOffsets: {
  [frameType in (typeof tokenizedFrameTypes)[number]]: number
} = {
  silver: 1 << 16,
  gold: 2 << 16
}
const conquestTicketOffest = (1 << 16) * 254 + 1 // 16646145

const prismLabels: Record<Prism, string> = {
  str: 'Strength',
  agy: 'Agility',
  int: 'Intellect',
  wis: 'Wisdom',
  hrt: 'Heart',
  tok: 'Token',
  tut: 'Tutorial'
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1)

const joinParsedDescription = (parsedDescription: CardDescriptionToken[]) => {
  return parsedDescription.reduce<string>((acc, token) => {
    const { value } = token

    if (value.text) {
      acc += `${value.text}`
    }
    return acc
  }, '')
}

const joinFlavorText = (flavorText: CardDescriptionToken[]) => {
  return joinParsedDescription(
    flavorText.map((t) => {
      const val = t.value
      if (
        t.type === 'explainer' &&
        typeof val === 'object' &&
        'text' in val &&
        typeof val.text === 'string'
      ) {
        return {
          ...t,
          value: { ...t.value, text: `\n -${t.value.text}` }
        }
      }
      return t
    })
  )
}

const getHashPrefix = (md5Hash: string) =>
  base64url.fromBase64(
    Buffer.from(md5Hash, 'hex').slice(0, 6).toString('base64')
  )

const getRemoteImagePath = async (localImagePath: string) => {
  const md5Hash = await FileHashCache.get(localImagePath)
  return localImagePath.replace(
    assetsPath,
    `https://assets.skyweaver.net/${getHashPrefix(md5Hash!)}`
  )
}

// TODO add multi-lang support
export async function generateCardTokenMetadata(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const t = await i18nInitNewInstance({
    defaultNS: 'translation',
    lng: 'en',
    version: '',
    parseMissingKeyHandler: (key) => {
      if (key.includes('triggers')) {
        // ok, lotsa weird triggers stuff!
        return key
      }
      throw new Error(`Tried to get translation for non-existing key ${key}`)
    }
  })
  await orchestrator.processCommandBlocks(
    tokenizedFrameTypes.reduce<CommandBlock[]>((acc, frameType) => {
      return acc.concat(
        Array.from(CardLibrary.keys())
          .map((c) => [c, CardLibrary.get(c)!] as const)
          .filter(
            ([_, card]) =>
              card.prism !== 'tut' &&
              card.prism !== 'tok' &&
              card.type !== 'heroAbility'
          ) // skip tutorial & token cards, they don't need metadata.
          .map(([cardID, card]) => {
            const srcImage = path.join(
              webappAssetsPath,
              `cards/full-cards/en/6x/${cardID}-${frameType}.webp`
            )

            const artists = CARD_ARTISTS.filter((a) =>
              card.artSlug.includes(a.id)
            )

            const onChainID = cardIdOffsets[frameType] + Number(cardID)

            const context = CommandBlock.createContext(
              [srcImage],
              path.join(metadataPath, `${onChainID}.json`),
              frameType +
                artists.map((a) => a.name + a.url) +
                getRenderAffectingCardPropsString(cardID, t)
            )

            const attachedSpellName = card.attachment
              ? t(`cards:${card.attachment}.name`)
              : undefined

            const cardName = t(`cards:${cardID}.name`)
            const cardText = t(`cards:${cardID}.description`)
            const cardFlavorText = t(`cards:${cardID}.flavorText`)

            return new CommandBlock(context, async () => {
              const metadata = {
                name: `${cardName} (${capitalize(frameType)})`,
                description:
                  joinParsedDescription(
                    getParsedCardDescription(
                      cardText,
                      (id) => t(`cards:${id as BaseCard}.name`),
                      t
                    )
                  ).replaceAll('\n', '') +
                  (cardFlavorText
                    ? '\n\n' +
                      joinFlavorText(
                        getParsedCardDescription(
                          cardFlavorText,
                          () => {
                            throw new Error(
                              "don't reference base cards in flavor text"
                            )
                          },
                          t
                        )
                      )
                    : ''),
                image: await getRemoteImagePath(srcImage),
                decimals: 2,
                external_url: `https://play.skyweaver.net/items/card/${onChainID}`,
                properties: {
                  baseCardId: Number(cardID),
                  type: capitalize(frameType),
                  cardType: capitalize(card.type),
                  element: capitalize(card.element),
                  prism: prismLabels[card.prism],
                  mana: card.cost,
                  ...(card.type === 'unit'
                    ? { health: card.health, power: card.power }
                    : {}),
                  ...Object.fromEntries(
                    card.traits.map((trait) => [
                      `trait: ${trait}`,
                      { name: 'Trait', value: trait }
                    ])
                  ),
                  ...(attachedSpellName
                    ? { attachment: attachedSpellName }
                    : {}),
                  ...Object.fromEntries(
                    artists.map((artist) => [
                      `Artist: ${artist.id}`,
                      { name: 'Artist', value: artist.name }
                    ])
                  )
                }
              }

              await writeFileAsync(
                context.outputFile,
                JSON.stringify(metadata, null, 2)
              )
            })
          })
      )
    }, [])
  )
}

export function generateConquestTicketMetadata(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  const srcImage = path.join(
    webappAssetsPath,
    'icons/conquest-ticket-gray.webp'
  )

  const context = CommandBlock.createContext(
    [srcImage],
    path.join(metadataPath, `${conquestTicketOffest}.json`)
  )

  return orchestrator.processCommandBlocks([
    new CommandBlock(context, async () => {
      const metadata = {
        name: 'Old Conquest Ticket',
        decimals: 2,
        description: 'UNUSABLE. This item has moved off-chain.',
        image: await getRemoteImagePath(srcImage),
      }

      await writeFileAsync(
        context.outputFile,
        JSON.stringify(metadata, null, 2)
      )
    })
  ])
}

export function generateCrystalMetadata(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  return orchestrator.processCommandBlocks(
    [...new Set([...CrystalLibrary.values()])].map((crystal) => {
      const srcImage = path.join(
        assetsPath,
        '/cosmetics/crystals/',
        `${crystal.artID}.png`
      )
      const context = CommandBlock.createContext(
        [srcImage],
        path.join(metadataPath, `${crystalBaseOffset + crystal.id}.json`),
        crypto.createHash('md5').update(JSON.stringify(crystal)).digest('hex')
      )

      return new CommandBlock(context, async () => {
        const metadata = {
          name: crystal.name,
          description: crystal.flavorText,
          image: await getRemoteImagePath(srcImage),
          decimals: 2,
          properties: {
            type: 'Crystal',
            color: crystal.color
          }
        }

        await writeFileAsync(
          context.outputFile,
          JSON.stringify(metadata, null, 2)
        )
      })
    }, [])
  )
}

export function generateStickerMetadata(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  return orchestrator.processCommandBlocks(
    [...new Set([...StickerLibrary.values()])].map((sticker) => {
      const srcImage = path.join(
        assetsPath,
        '/webapp/stickers/6x',
        `${sticker.artID}.webp`
      )
      const context = CommandBlock.createContext(
        [srcImage],
        path.join(metadataPath, `${stickerBaseOffset + sticker.id}.json`),
        crypto.createHash('md5').update(JSON.stringify(sticker)).digest('hex')
      )

      return new CommandBlock(context, async () => {
        const metadata = {
          name: sticker.name,
          description: sticker.flavorText,
          image: await getRemoteImagePath(srcImage),
          decimals: 2,
          properties: {
            type: 'Sticker'
          }
        }

        await writeFileAsync(
          context.outputFile,
          JSON.stringify(metadata, null, 2)
        )
      })
    }, [])
  )
}

export function generateHeroSkinMetadata(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  return orchestrator.processCommandBlocks(
    [...new Set([...HeroSkinLibrary.values()])].map((heroSkin) => {
      const srcImage = path.join(
        assetsPath,
        '/webapp/heroes/full-cards/6x',
        `${heroSkin.artID}.webp`
      )
      const context = CommandBlock.createContext(
        [srcImage],
        path.join(metadataPath, `${heroSkinBaseOffset + heroSkin.id}.json`),
        crypto.createHash('md5').update(JSON.stringify(heroSkin)).digest('hex')
      )

      return new CommandBlock(context, async () => {
        const metadata = {
          name: heroSkin.name,
          description: heroSkin.flavorText,
          image: await getRemoteImagePath(srcImage),
          decimals: 2,
          properties: {
            type: 'Hero Skin',
            hero:
              heroSkin.hero[0].toUpperCase() +
              heroSkin.hero.slice(1).toLowerCase(),
            prisms: {
              name: 'Prisms',
              value: DECKCLASS_PRISMS[HERO_DECKCLASS[heroSkin.hero]]
            }
          }
        }

        await writeFileAsync(
          context.outputFile,
          JSON.stringify(metadata, null, 2)
        )
      })
    }, [])
  )
}

export function generateCardBackMetadata(
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) {
  return orchestrator.processCommandBlocks(
    [...new Set([...CardBackLibrary.values()])].map((cardBack) => {
      const srcImage = path.join(
        assetsPath,
        '/webapp/card-backs/6x',
        `${cardBack.artID}.webp`
      )
      const context = CommandBlock.createContext(
        [srcImage],
        path.join(metadataPath, `${cardBackBaseOffset + cardBack.id}.json`),
        crypto.createHash('md5').update(JSON.stringify(cardBack)).digest('hex')
      )

      return new CommandBlock(context, async () => {
        const metadata = {
          name: cardBack.name,
          description: cardBack.flavorText,
          image: await getRemoteImagePath(srcImage),
          decimals: 2,
          properties: {
            type: 'Card Back'
          }
        }

        await writeFileAsync(
          context.outputFile,
          JSON.stringify(metadata, null, 2)
        )
      })
    }, [])
  )
}
