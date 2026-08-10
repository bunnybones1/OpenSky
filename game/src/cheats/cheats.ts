import { i18n, TFuncKey } from '@opensky/language-manager'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import {
  BaseCard,
  CardLibrary,
  Element,
  GameState,
  Player,
  PlayerAction,
  Rarity,
  SkyWeaver,
  Trait,
  Zone
} from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  elementsArr,
  traitsArr
} from '~/constants'
import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { RarityStrings } from '~/helpers/typeHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { store } from '~/state'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import inputProvider from '~/systems/input/input'
import { KeyboardKey } from '~/systems/input/keyboard'
import { CardStatus } from '~/types'

import { getBaseCard } from '../utils/card'
import ColliderMesh from '../utils/ColliderMesh'
import { globalAccess } from '../utils/globalAccess'
import { notEmpty } from '../utils/jsUtils'
import { makeInteractive } from '../utils/makeInteractive'
import { makeQuickButtonColumn, QuickButtonData } from '../utils/quickButton'

interface Bindable {
  defaultBinding?:
    | KeyboardKey
    | [KeyboardKey | undefined, KeyboardKey | undefined]
    | null
  onKeyBound?: (id: string, key: KeyboardKey | null, cb: () => void) => void
}

interface Deletable {
  onDelete?: () => void
}

export type CheatsItem<T> = { id?: string; requiresTarget?: true } & (
  | {
      title: TFuncKey
      nonGameAction: () => void
    }
  | {
      title: TFuncKey
      playerAction: (player: Player) => T | void
    }
  | { title: TFuncKey; action: () => T | void }
  | {
      title: TFuncKey
      enabled: (game: GameState<SkyWeaver>) => boolean
      toggle: (newState: boolean) => T
    }
  | {
      niceBoolean: NiceBooleanParameter
    }
  | {
      headers: [TFuncKey, TFuncKey]
    }
  | {
      header: TFuncKey
    }
  | { divider: true }
  | CardCheat<any>
)

export type BindableCheatsItem = CheatsItem<void> & Bindable & Deletable

export function changeMaxMana(player: Player): PlayerAction | void {
  const delta = Number.parseInt(
    window.prompt(i18n.t('ui.cheats.promptHowMuchMaxMana'), '') || '',
    10
  )
  if (!delta) {
    return
  }
  return {
    type: 'Cheat',
    cheats: [
      {
        type: 'ChangeMaxMana',
        player,
        delta
      }
    ]
  }
}

function getAndParseCards(promptTitle: string): BaseCard[] {
  const pickedCards = window.prompt(
    promptTitle + '\n' + i18n.t('ui.cheats.modifiers.promptWhichCards'),
    ''
  )
  if (!pickedCards) {
    return []
  }
  const parsedCards: Array<[string, BaseCard | undefined]> = []
  const pickedCardsSplit = pickedCards.split(',')
  while (pickedCardsSplit.length) {
    let done = false
    for (let i = pickedCardsSplit.length; i > 0; i--) {
      const nameTry = pickedCardsSplit.slice(0, i).join(',')
      const maybeBase = getBaseCard(nameTry)
      if (maybeBase) {
        const card = CardLibrary.get(maybeBase)
        if (
          (card && card.prism !== 'tut' && card.type !== 'heroAbility') ||
          gameMode !== LocalGameMode.SANDBOX
        ) {
          parsedCards.push([nameTry, maybeBase])
          pickedCardsSplit.splice(0, i)
          done = true
          break
        }
      }
    }
    if (!done) {
      const n = pickedCardsSplit.shift()!
      parsedCards.push([n, undefined])
    }
  }
  const errors = []
  for (const [text, pickedCard] of parsedCards) {
    if (!pickedCard && (text?.trim().length || 0) > 0) {
      errors.push(
        i18n.t('ui.cheats.modifiers.invalidCard', {
          input: text
        })
      )
    }
  }
  if (errors.length) {
    alert(errors.join('\n'))
  }
  return parsedCards.map(x => x[1]).filter(notEmpty)
}

export function createCardsAndPutInZone(
  player: Player,
  zone: Zone,
  title: string
): PlayerAction | void {
  const parsedCards = getAndParseCards(title)
  if (parsedCards.length === 0) {
    return
  }
  return {
    type: 'Cheat',
    cheats: parsedCards.map(id => ({
      type: 'AddBaseCardToZone',
      card: id,
      player,
      zone
    }))
  }
}

export function summonUnits(
  player: Player,
  title: string
): PlayerAction | undefined {
  const parsedCards = getAndParseCards(title)
  if (parsedCards.length === 0) {
    return
  }
  return {
    type: 'Cheat',
    cheats: parsedCards.map(id => ({
      type: 'SummonBaseUnit',
      card: id,
      player
    }))
  }
}

export function areCheatsEnabled(): boolean {
  return (
    Boolean(store.state?.state?.gameParams?.cheatsAllowed) &&
    (gameMode === LocalGameMode.SANDBOX ||
      (!!globalAccess?.ui?.hasContainer('cheats') &&
        globalAccess.ui.getContainer('cheats').active))
  )
}

export type CardCheat<T extends { [index: string]: Promise<unknown> }> = {
  title: TFuncKey
  filter: (c: RelaxedCardInstance, zone: CardStatus | undefined) => boolean
} & (RunWithContext<T> | RunWithoutContext)

interface RunWithContext<T extends { [index: string]: unknown }> {
  getContext: {
    [K in keyof T]: () => Promise<T[K] | '?'> | T[K] | '?'
  }
  run: (c: RelaxedCardInstance, zone: CardStatus, context: T) => PlayerAction
}

interface RunWithoutContext {
  run: (c: RelaxedCardInstance, zone: CardStatus) => PlayerAction
}

const isUnitOrHero = (c: RelaxedCardInstance) =>
  isUnit(c) || c.state.view.type === 'hero'

const isUnit = (c: RelaxedCardInstance) => c.state.view.type === 'unit'

function ctx<T extends { [index: string]: unknown }>(
  c: {
    title: TFuncKey
    filter: (c: RelaxedCardInstance, zone: CardStatus) => boolean
  } & RunWithContext<T>
): {
  title: TFuncKey
  filter: (c: RelaxedCardInstance, zone: CardStatus) => boolean
} & RunWithContext<T> {
  return c
}
function run(
  c: {
    title: TFuncKey
    filter: (c: RelaxedCardInstance, zone: CardStatus) => boolean
  } & RunWithoutContext
) {
  return c
}

export const cardCheats: ReadonlyArray<CardCheat<any>> = [
  run({
    run: card => {
      console.log(getCardCache().getEntity(card))
      return { type: 'Cheat', cheats: [] }
    },
    title: 'ui.cheats.entity',
    filter: () => true
  }),
  ctx({
    title: 'ui.cheats.modifiers.giveAttachment',
    filter: isUnitOrHero,
    getContext: {
      attachment_base: () => {
        const input = window.prompt(
          i18n.t('ui.cheats.modifiers.promptWhichAttachment'),
          ''
        )
        if (!input) {
          throw new Error('invalid card')
        }
        if (input === '?') {
          return '?'
        }
        const pickedCard = getBaseCard(input)
        if (!pickedCard) {
          alert(
            i18n.t('ui.cheats.modifiers.invalidCard', {
              input
            })
          )
          throw new Error('invalid card')
        }
        return pickedCard
      }
    },
    run: (c, _, { attachment_base }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'AttachBaseCardToParent',
          parent: { id: c.id },
          attachment_base
        }
      ]
    })
  }),
  ctx({
    title: 'ui.cheats.modifiers.modifyHealth',
    filter: isUnitOrHero,
    getContext: {
      delta: () => {
        const res =
          window.prompt(
            i18n.t('ui.cheats.modifiers.promptHowMuchHealth'),
            ''
          ) || ''
        if (res === '?') {
          return '?'
        }
        const delta = Number.parseInt(res || '', 10)
        if (!delta) {
          throw new Error('Invalid health ' + res)
        }
        return delta
      }
    },
    run: (c, _, { delta }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: c.id },
          modifier: {
            ModifyHealth: [delta, undefined]
          }
        }
      ]
    })
  }),
  ctx({
    title: 'ui.cheats.modifiers.modifyPower',
    filter: isUnitOrHero,
    getContext: {
      delta: () => {
        const res =
          window.prompt(i18n.t('ui.cheats.modifiers.promptHowMuchPower'), '') ||
          ''
        if (res === '?') {
          return '?'
        }
        const delta = Number.parseInt(res || '', 10)
        if (!delta) {
          throw new Error('Invalid power ' + res)
        }
        return delta
      }
    },
    run: (c, _, { delta }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: c.id },
          modifier: {
            ModifyPower: [delta, undefined]
          }
        }
      ]
    })
  }),
  ctx({
    title: 'ui.cheats.modifiers.setCost',
    filter: c => c.state.view.type !== 'hero',
    getContext: {
      SetCost: () => {
        const res =
          window.prompt(i18n.t('ui.cheats.modifiers.promptCost'), '') || ''
        if (res === '?') {
          return res
        }
        const delta = Number.parseInt(res || '', 10)
        if (!delta && delta !== 0) {
          throw new Error('Invalid cost ' + res)
        }
        return delta
      }
    },
    run: (c, _, { SetCost }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: c.id },
          modifier: {
            SetCost: SetCost
          }
        }
      ]
    })
  }),
  ctx({
    title: 'ui.cheats.modifiers.moveToZone',
    filter: c => c.state.view.type !== 'hero',
    getContext: {
      player: async () => {
        const player = await new Promise<Player | '?' | 'current'>(
          (res, rej) => {
            if (!globalAccess.ui) {
              rej(new Error('no UI!'))
              return
            }
            const menu = new ContextMenu([
              new QuickButtonData('current owner', () => {
                res('current')
              }),
              new QuickButtonData('my side', () => {
                res(store.player!)
              }),
              new QuickButtonData('enemy side', () => {
                res((1 - store.player!) as Player)
              }),
              new QuickButtonData('?', () => res('?'))
            ])
            const container = globalAccess.ui.getContainer('cheats')
            container.add(menu.object)
          }
        )
        return player
      },
      zone: async () => {
        const player = await new Promise<Zone | '?' | 'current'>((res, rej) => {
          if (!globalAccess.ui) {
            rej(new Error('no UI!'))
            return
          }

          const destinationZones: Zone[] = [
            { name: 'Deck' },
            { name: 'Hand', public: true },
            { name: 'Hand', public: false },
            { name: 'Field' },
            { name: 'Graveyard' },
            { name: 'Dust', public: true }
          ]
          const buttons: QuickButtonData[] = destinationZones.map(
            zone =>
              new QuickButtonData(
                i18n.t(
                  `zone.${
                    'public' in zone && zone.public
                      ? (`Revealed${zone.name}` as const)
                      : zone.name
                  }`
                ),
                () => res(zone)
              )
          )
          const container = globalAccess.ui.getContainer('cheats')
          container.add(new ContextMenu(buttons).object)
        })
        return player
      }
    },
    run: (card, _, { player, zone }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'MoveCardToZone',
          card: { id: card.id },
          new_owner:
            player === 'current'
              ? getCardCache().getLocation(card.id)?.player ??
                (() => {
                  throw new Error("can't find card")
                })()
              : player,
          new_zone:
            zone === 'current'
              ? getCardCache().getLocation(card.id)?.location[0] ??
                (() => {
                  throw new Error("can't find card")
                })()
              : zone
        }
      ]
    })
  }),
  run({
    title: 'ui.cheats.modifiers.removeAttachment',
    filter: c => !!c.attachment,
    run: card => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'DustCardThroughLimboFirst',
          card: { id: card.attachment! }
        }
      ]
    })
  }),
  run({
    title: 'ui.cheats.modifiers.readyThisUnit',
    filter: (card, zone) =>
      (zone === 'Field' && card.state.view.attackState === 'Exhausted') ||
      card.state.view.attackState === 'Sleeping',
    run: card => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: card.id },
          modifier: {
            SetDidAttack: false
          }
        },
        {
          type: 'ApplyModifierToCard',
          card: { id: card.id },
          modifier: {
            SetAttackState: 'Ready'
          }
        }
      ]
    })
  }),
  ctx({
    title: 'ui.cheats.modifiers.setRarity',
    filter: () => true,
    getContext: {
      rarity: () => {
        return new Promise<Rarity>((res, rej) => {
          if (!globalAccess.ui) {
            rej(new Error('no UI!'))
            return
          }
          const buttons: QuickButtonData[] = RarityStrings.map(
            rarity =>
              new QuickButtonData(i18n.t(`cardMeta:rarity.${rarity}`), () =>
                res(rarity)
              )
          )
          const container = globalAccess.ui.getContainer('cheats')
          container.add(new ContextMenu(buttons).object)
        })
      }
    },
    run: (card, _, { rarity }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ModifyCardRarity',
          card: { id: card.id },
          rarity
        }
      ]
    })
  }),
  ctx({
    title: 'ui.cheats.modifiers.giveTrait',
    filter: () => true,
    getContext: {
      GrantTrait: () => {
        return new Promise<Trait>((res, rej) => {
          if (!globalAccess.ui) {
            rej(new Error('no UI!'))
            return
          }
          const buttons: QuickButtonData[] = traitsArr.map(
            trait =>
              new QuickButtonData(
                i18n.t(`cardMeta:traits.titleCase.${trait}`),
                () => res(trait)
              )
          )
          const container = globalAccess.ui.getContainer('cheats')
          container.add(new ContextMenu(buttons).object)
        })
      }
    },
    run: (card, _, { GrantTrait }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: card.id },
          modifier: { GrantTrait }
        }
      ]
    })
  }),

  run({
    title: 'ui.cheats.modifiers.removeTraits',
    filter: c => isUnitOrHero(c) && !!c.state.view.traits.length,
    run: c => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: c.id },
          modifier: {
            SetTraits: []
          }
        }
      ]
    })
  }),

  ctx({
    title: 'ui.cheats.modifiers.setElement',
    filter: isUnit,
    getContext: {
      SetElement: () => {
        return new Promise<Element>((res, rej) => {
          if (!globalAccess.ui) {
            rej(new Error('no UI!'))
            return
          }
          const buttons: QuickButtonData[] = elementsArr.map(
            element =>
              new QuickButtonData(
                i18n.t(`cardMeta:elements.titleCase.${element}`),
                () => res(element)
              )
          )
          const menu = new ContextMenu(buttons)
          const container = globalAccess.ui.getContainer('cheats')
          container.add(menu.object)
        })
      }
    },
    run: (c, _, { SetElement }) => ({
      type: 'Cheat',
      cheats: [
        {
          type: 'ApplyModifierToCard',
          card: { id: c.id },
          modifier: {
            SetElement
          }
        }
      ]
    })
  })
]

export function tryCreateCheatsContextMenu(
  card: RelaxedCardInstance | undefined,
  zone: CardStatus | undefined
) {
  if (!globalAccess.ui) {
    return
  }
  if (!areCheatsEnabled()) {
    return
  }
  if (!card || !zone) {
    return
  }

  const container = globalAccess.ui.getContainer('cheats')
  const cc = cardCheats.filter(c => c.filter(card, zone))
  const macroCheats: Array<{
    title: string
    cheat: CardCheat<any>
    context: {
      [index: string]: unknown
    }
  }> = []
  for (const macro of container.macros) {
    const cardCheat = cardCheats.find(
      c => 'id' in macro.action && c.title === macro.action.id
    )
    if (
      'context' in macro.action &&
      cardCheat &&
      cardCheat.filter(card, zone)
    ) {
      macroCheats.push({
        cheat: cardCheat,
        title: macro.title,
        context: macro.action.context
      })
    }
  }
  container.add(new CheatsContextMenu(cc, macroCheats, card, zone).object)
}

const BUTTON_SPACING = 8

class CheatsContextMenu implements IInteractive {
  object: Object2D
  collider: ColliderMesh
  cursor: CursorType = 'pointer'

  constructor(
    cardCheats: CardCheat<any>[],
    macros: Array<{
      title: string
      cheat: CardCheat<any>
      context: { [index: string]: any }
    }>,
    card: RelaxedCardInstance,
    zone: CardStatus
  ) {
    this.object = new Object2D()
    const popupContainer = new RectangleMesh(new RectangleMaterial({}))
    popupContainer.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    popupContainer.matrix.opacity = 0
    this.object.add(popupContainer)
    this.collider = makeInteractive(popupContainer, this, ReadonlyPin.FullSize)

    const mousePos = inputProvider.positionPixels
    const listHeight =
      Math.max(cardCheats.length, macros.length) *
      (BUTTON_HEIGHT + BUTTON_SPACING)
    const listY = Math.min(mousePos.y, renderMetrics.uiHeight - listHeight) - 16
    const listX = Math.min(mousePos.x, renderMetrics.uiWidth - 300) - 16

    makeQuickButtonColumn(
      this.object,
      cardCheats.map(cardCheat => {
        return {
          label: i18n.t(cardCheat.title) as string,
          onSelect: () => {
            globalAccess
              .ui!.getContainer('cheats')
              .recordMacroOrApplyAction(cardCheat, {}, card, zone)
            this.removeSelfFromParent()
          }
        }
      }),
      ReadonlyPin.TopLeft,
      Pin.fromPixels(listX, listY),
      BUTTON_SPACING,
      150
    )
    makeQuickButtonColumn(
      this.object,
      macros.map(cardCheat => {
        return {
          label: cardCheat.title,
          onSelect: () => {
            globalAccess
              .ui!.getContainer('cheats')
              .recordMacroOrApplyAction(
                cardCheat.cheat,
                cardCheat.context,
                card,
                zone
              )
            this.removeSelfFromParent()
          }
        }
      }),
      ReadonlyPin.TopLeft,
      Pin.fromPixels(listX + 150 + BUTTON_MARGINS, listY),
      BUTTON_SPACING,
      150
    )
  }

  onSelect() {
    this.removeSelfFromParent()
  }

  onDown() {
    this.removeSelfFromParent()
  }

  removeSelfFromParent() {
    this.object.parent?.remove(this.object)
  }
}

class ContextMenu implements IInteractive {
  object: Object2D
  collider: ColliderMesh
  cursor: CursorType = 'pointer'

  constructor(buttons: QuickButtonData[]) {
    this.object = new Object2D()
    const popupContainer = new RectangleMesh(new RectangleMaterial({}))
    popupContainer.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    popupContainer.matrix.opacity = 0
    this.object.add(popupContainer)
    this.collider = makeInteractive(popupContainer, this, ReadonlyPin.FullSize)

    const mousePos = inputProvider.positionPixels
    const listHeight = buttons.length * (BUTTON_HEIGHT + BUTTON_SPACING)
    const listY = Math.min(mousePos.y, renderMetrics.uiHeight - listHeight) - 16
    const listX = Math.min(mousePos.x, renderMetrics.uiWidth - 300) - 16

    makeQuickButtonColumn(
      this.object,
      buttons.map(button => {
        return {
          ...button,
          onSelect: () => {
            button.onSelect()
            this.removeSelfFromParent()
          }
        }
      }),
      ReadonlyPin.TopLeft,
      Pin.fromPixels(listX, listY),
      BUTTON_SPACING,
      150
    )
  }

  onSelect() {
    this.removeSelfFromParent()
  }

  onDown() {
    this.removeSelfFromParent()
  }

  removeSelfFromParent() {
    this.object.parent?.remove(this.object)
  }
}
