import { i18n, TFuncKey } from '@opensky/language-manager'
import { DeckClass, Hero } from '@opensky/proto'
import { HERO_DECKCLASS } from '@opensky/shared/constants'
import { LocalGameMode } from '@opensky/shared/gameModes'
import { removeFromArrayByPredicate } from '@opensky/shared/utils/arrayUtils'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import { Cheat, Player, PlayerAction } from '@skyweaver/state-metadata'
import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  areCheatsEnabled,
  BindableCheatsItem,
  CardCheat,
  cardCheats,
  changeMaxMana,
  CheatsItem,
  createCardsAndPutInZone,
  summonUnits
} from '~/cheats/cheats'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import {
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  SIDEBAR_WIDTH
} from '~/constants'
import env from '~/env'
import { gameMode } from '~/helpers/envGameModeHelpers'
import { putChildAtBottom } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import keyboardShortcuts from '~/keyboardShortcuts'
import Object2D from '~/meshes/Object2D'
import { store } from '~/state'
import StateRecorder from '~/state/StateRecorder'
import { switchSides } from '~/state/switchSides'
import inputProvider, { underPointer } from '~/systems/input/input'
import keyboard, { KeyboardKey } from '~/systems/input/keyboard'
import { takeAction } from '~/systems/input/StateInteractions'
import { fontFaces } from '~/systems/text/FontFace'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { CardStatus } from '~/types'
import { showCauseAndEffect } from '~/userSettings'
import { downloadJson, uploadJson } from '~/utils/jsonDownloader'
import {
  changeUrlParamAndReload,
  changeUrlParamWithoutReload
} from '~/utils/location'
import { quickLoadFromQueryParams, quickSave } from '~/utils/quickSaves'
import { recursivelySetDepth } from '~/utils/threeUtils'
import {
  createButton,
  createButtonText,
  makeButtonBindable,
  makeButtonDeletable
} from '~/utils/ui'

import { UI } from '..'
import Checkbox from '../components/Checkbox'
import {
  ROW_HEIGHT,
  SidebarPosition,
  SidebarStatus
} from '../components/SlideOutSidebar/constants'
import {
  createCloseButton,
  SidebarRow,
  SlideOutSidebar
} from '../components/SlideOutSidebar/SlideOutSidebar'
import UIContainer from '../components/UIContainer'

class CheatsRow extends Object2D implements SidebarRow {
  item: BindableCheatsItem
  constructor(
    cardContext:
      | SlideOutSidebar<any, any, CheatsRow>
      | [RelaxedCardInstance, CardStatus],
    item: BindableCheatsItem
  ) {
    super()

    this.item = item
    this.matrix.setConstraints(
      Pin.fromPixels(SIDEBAR_WIDTH, ROW_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
    if ('divider' in item) {
      const divider = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle'
      )
      divider.matrix.setConstraints(
        new Pin(1, 0, 0, 1),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      divider.matrix.setColor(new Color(0x534787))
      this.add(divider)
      this.matrix.setConstraints(
        Pin.fromPixels(SIDEBAR_WIDTH, 1),
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.clone()
      )
    } else if ('playerAction' in item) {
      const action = item.playerAction
      const meButton = createButton(this, () => action(store.player!))
      createButtonText(meButton.mesh, i18n.t(item.title) as string)
      if (item.onKeyBound) {
        makeButtonBindable(meButton, item.title, `${item.title}p0`, {
          defaultBinding: Array.isArray(item.defaultBinding)
            ? item.defaultBinding[0]
            : item.defaultBinding,
          onBindingChanged: item.onKeyBound
        })
      }

      const botButton = createButton(this, () =>
        action((1 - store.player!) as Player)
      )
      createButtonText(botButton.mesh, i18n.t(item.title) as string)
      if (item.onKeyBound) {
        makeButtonBindable(botButton, item.title, `${item.title}p1`, {
          defaultBinding: Array.isArray(item.defaultBinding)
            ? item.defaultBinding[1]
            : item.defaultBinding,
          onBindingChanged: item.onKeyBound
        })
      }

      meButton.mesh.matrix.setConstraints(
        new Pin(0.5, 1, -BUTTON_MARGINS * 2, -BUTTON_MARGINS),
        ReadonlyPin.Left,
        ReadonlyPin.Left.cloneOffset(BUTTON_MARGINS, 0)
      )
      botButton.mesh.matrix.setConstraints(
        new Pin(0.5, 1, -BUTTON_MARGINS * 2, -BUTTON_MARGINS),
        ReadonlyPin.Right,
        ReadonlyPin.Right.cloneOffset(-BUTTON_MARGINS, 0)
      )

      const divider = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle'
      )
      divider.matrix.setConstraints(
        new Pin(0, 1, 1, 0),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      divider.matrix.setColor(new Color(0x534787))
      this.add(divider)
    } else if ('action' in item) {
      const action = item.action
      const button = createButton(this, action)
      createButtonText(button.mesh, i18n.t(item.title) as string)
      button.mesh.matrix.setConstraints(
        new Pin(1, 1, -BUTTON_MARGINS * 2, -BUTTON_MARGINS),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      if (item.requiresTarget) {
        button.disabled = true
      }
      if (item.onKeyBound) {
        makeButtonBindable(button, item.title, item.title, {
          defaultBinding: Array.isArray(item.defaultBinding)
            ? item.defaultBinding[0]
            : item.defaultBinding,
          onBindingChanged: item.onKeyBound
        })
      }
      if (item.onDelete) {
        makeButtonDeletable(button, item.onDelete)
      }
    } else if ('nonGameAction' in item) {
      const action = item.nonGameAction
      const button = createButton(this, action)
      createButtonText(button.mesh, i18n.t(item.title) as string)
      if (item.onKeyBound) {
        makeButtonBindable(button, item.title, item.title, {
          defaultBinding: Array.isArray(item.defaultBinding)
            ? item.defaultBinding[0]
            : item.defaultBinding,
          onBindingChanged: item.onKeyBound
        })
      }
      if (item.onDelete) {
        makeButtonDeletable(button, item.onDelete)
      }
      button.mesh.matrix.setConstraints(
        new Pin(1, 1, -BUTTON_MARGINS * 2, -BUTTON_MARGINS),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
    } else if ('toggle' in item) {
      const nb = new NiceBooleanParameter(
        i18n.t(item.title) as string,
        '',
        store.state ? item.enabled(store.state) : true,
        'never',
        undefined,
        undefined,
        undefined,
        false
      )
      store.subscribeToStateChanges(store => {
        if (store.state) {
          nb.value = item.enabled(store.state)
        }
      })
      nb.listen(item.toggle)
      const checkbox = new Checkbox(nb, false)

      checkbox.mesh.matrix.setConstraints(
        new Pin(0, 1, 1, 0),
        ReadonlyPin.Right,
        ReadonlyPin.Right
      )
      this.add(checkbox.mesh)
      createButtonText(
        this,
        i18n.t(item.title) as string,
        {
          ...textOptions.optionsButtonText,
          align: 'left'
        },
        undefined,
        ReadonlyPin.Left.cloneOffset(BUTTON_MARGINS, 0)
      )
    } else if ('niceBoolean' in item) {
      const checkbox = new Checkbox(item.niceBoolean, false)

      checkbox.mesh.matrix.setConstraints(
        new Pin(0, 1, 1, 0),
        ReadonlyPin.Right,
        ReadonlyPin.Right
      )
      this.add(checkbox.mesh)
      createButtonText(
        this,
        typeof item.niceBoolean.label === 'string'
          ? item.niceBoolean.label
          : item.niceBoolean.label(),
        {
          ...textOptions.optionsButtonText,
          align: 'left'
        },
        undefined,
        ReadonlyPin.Left.cloneOffset(BUTTON_MARGINS, 0)
      )
    } else if ('run' in item) {
      const action = item.run
      const button = createButton(this, () => {
        if (Array.isArray(cardContext)) {
          'getContext' in item
            ? Object.entries(item.getContext).reduce<
                Promise<Array<[keyof typeof item.getContext, any]>>
              >(
                (prev, [key, value]) =>
                  prev.then(p => {
                    const v = Promise.resolve(value())
                    return v.then(val => [...p, [key, val] as const]) as any
                  }),
                Promise.resolve([])
              )
            : Promise.resolve([])
                .then(Object.fromEntries)
                .then(context => action(...cardContext, context))
        }
      })
      createButtonText(button.mesh, i18n.t(item.title) as string)
      if (item.onKeyBound) {
        makeButtonBindable(button, item.title, item.title, {
          defaultBinding: Array.isArray(item.defaultBinding)
            ? item.defaultBinding[0]
            : item.defaultBinding,
          onBindingChanged: item.onKeyBound
        })
      }
      if (item.onDelete) {
        makeButtonDeletable(button, item.onDelete)
      }
      button.mesh.matrix.setConstraints(
        new Pin(1, 1, -BUTTON_MARGINS * 2, -BUTTON_MARGINS),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
    } else if ('headers' in item) {
      const meText = new UITextMesh(i18n.t(item.headers[0]) as string, {
        ...textOptions.generic,
        color: new Color(0x725aaa),
        fontFace: fontFaces.BarlowCondensedMedium,
        size: 24
      })
      const botText = new UITextMesh(i18n.t(item.headers[1]) as string, {
        ...textOptions.generic,
        color: new Color(0x725aaa),
        fontFace: fontFaces.BarlowCondensedMedium,
        size: 24
      })
      this.add(meText)
      this.add(botText)
      meText.matrix.setConstraints(
        undefined,
        ReadonlyPin.Right,
        new Pin(1 / 4, 0.5)
      )
      botText.matrix.setConstraints(
        undefined,
        ReadonlyPin.Left,
        new Pin(3 / 4, 0.5)
      )
      const divider = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'rectangle'
      )
      divider.matrix.setConstraints(
        new Pin(0, 1, 1, 0),
        ReadonlyPin.Center,
        ReadonlyPin.Center
      )
      divider.matrix.setColor(new Color(0x534787))
      this.add(divider)
    } else {
      createButtonText(this, i18n.t(item.header) as string)
    }
  }
}

function getCheatsItemID(itemOrId: string | CheatsItem<any>): string {
  return typeof itemOrId === 'string'
    ? itemOrId
    : 'id' in itemOrId && itemOrId.id
    ? itemOrId.id
    : 'divider' in itemOrId
    ? `${Math.random()}`
    : 'header' in itemOrId
    ? itemOrId.header
    : 'title' in itemOrId
    ? itemOrId.title
    : 'niceBoolean' in itemOrId
    ? itemOrId.niceBoolean.name
    : itemOrId.headers.join('-')
}
export default class CheatsContainer extends UIContainer {
  sidebar: SlideOutSidebar<BindableCheatsItem, string, CheatsRow>
  macroPanel: SlideOutSidebar<BindableCheatsItem, string, CheatsRow>
  macroPanelOpen: boolean
  recordingMacroUI?: Object2D
  macroRecordRow: CheatsRow
  macros: Array<{
    id: string
    title: string
    action:
      | PlayerAction
      | { id: TFuncKey; context: { [index: string]: unknown } }
  }>
  keybinds: Map<string, KeyboardKey>
  keybindCallbacks: Map<string, () => void>
  cardUnderPointer?: [RelaxedCardInstance, CardStatus]
  constructor(ui: UI, priority: number) {
    super(ui, 'cheats', {
      priority
    })
  }
  update(dt: number) {
    this.sidebar.update(dt)
    this.macroPanel.update(dt)
  }
  protected init() {
    inputProvider.onMove.addListener((x, y) => {
      this.cardUnderPointer = undefined
      underPointer.testHit(x, y, c => {
        if (c.has('cardInstance') && c.has('zone')) {
          this.cardUnderPointer = [
            c.get('cardInstance'),
            c.get('zone').current.cardStatus
          ]
          return true
        } else {
          return false
        }
      })
    })
    if (gameMode !== LocalGameMode.LOCAL_BOT) {
      setTimeout(() => {
        this.fadeIn()
      }, 1)
    }

    this.loadKeybinds()

    this.sidebar = new SlideOutSidebar(
      SidebarPosition.Left,
      CheatsRow,
      row => row.item,
      getCheatsItemID,
      {
        addToBottom: true
      }
    )
    this.add(this.sidebar)
    const closeButton = createCloseButton(this, this.sidebar)

    keyboard.listenToKey(keyboardShortcuts.Cheats, () => {
      this.sidebar.toggle()
    })

    // bring container back if hidden by dev cheats hider
    this.sidebar.onToggle(status => {
      const show =
        (status === SidebarStatus.Revealed ||
          status === SidebarStatus.Revealing) &&
        (!this.active || !this.visible)
      if (show) {
        this.fadeIn()
      }
      if (import.meta.hot) {
        import.meta.hot.data.sideBarOpen = show
      }
    })

    const cheatsButton = createButton(
      this,
      () => {
        this.sidebar.toggle()
      },
      Pin.fromPixels(100, 40),
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(
        -BUTTON_MARGINS,
        -END_TURN_BUTTON_HEIGHT - 12 - BUTTON_MARGINS
      )
    )
    createButtonText(cheatsButton.mesh, i18n.t('ui.cheats.cheatsButton'))

    recursivelySetDepth(this, 0.9)

    const items: Array<CheatsItem<PlayerAction>> = [
      {
        title: 'ui.cheats.quicksave',
        async nonGameAction() {
          quickSave(2, await StateRecorder.quickSave(), LocalGameMode.LOCAL_BOT)
        }
      },
      {
        title: 'ui.cheats.quickload',
        nonGameAction() {
          changeUrlParamWithoutReload('serializedGameQuickSlotSelector', '2')
          quickLoadFromQueryParams()
        }
      },
      {
        id: 'ui.cheats.switchsides',
        title: 'ui.cheats.switchsides',
        nonGameAction() {
          switchSides()
        }
      },
      {
        id: 'ui.cheats.saveAsLethalPuzzle',
        title: 'ui.cheats.saveAsLethalPuzzle',
        nonGameAction() {
          const title = prompt(i18n.t('ui.cheats.puzzleSave.promptTitle'))
          if (!title) {
            return
          }
          const authorName = prompt(i18n.t('ui.cheats.puzzleSave.promptName'))
          if (!authorName) {
            return
          }
          StateRecorder.downloadAsPuzzle(title, `by ${authorName}`)
          alert(i18n.t('ui.cheats.puzzleSave.uploadInstructions'))
        }
      },
      {
        title: 'ui.cheats.createPuzzleLink',
        nonGameAction() {
          const gist = prompt(i18n.t('ui.cheats.puzzleLink.promptUrl'))
          if (!gist) {
            return
          }
          prompt(
            i18n.t('ui.cheats.puzzleLink.linkMessage'),
            `${env.WEBAPP_URL}/latest/game/?mode=TUTORIAL&lethalPuzzleURL=${gist}`
          )
        }
      },
      { id: 'topdivider', divider: true },
      {
        title: 'ui.cheats.toggleMacrosPanel',
        nonGameAction: () => {
          this.macroPanel.toggle()
          this.macroPanelOpen =
            this.macroPanel.status === SidebarStatus.Revealed ||
            this.macroPanel.status === SidebarStatus.Revealing
          if (import.meta.hot) {
            import.meta.hot.data.macroPanelOpen = this.macroPanelOpen
          }
        }
      },
      {
        headers: ['ui.cheats.titles.player', 'ui.cheats.titles.bot']
      },
      {
        title: 'ui.cheats.addToHand',
        playerAction: player =>
          createCardsAndPutInZone(
            player,
            {
              name: 'Hand',
              public: false
            },
            i18n.t('ui.cheats.addToHand')
          )
      },
      {
        title: 'ui.cheats.addToDeck',
        playerAction: player =>
          createCardsAndPutInZone(
            player,
            {
              name: 'Deck'
            },
            'ui.cheats.addToDeck'
          )
      },
      {
        title: 'ui.cheats.addToGrave',
        playerAction: player =>
          createCardsAndPutInZone(
            player,
            {
              name: 'Graveyard'
            },
            'ui.cheats.addToGrave'
          )
      },
      {
        title: 'ui.cheats.dustHand',
        playerAction: player => ({
          type: 'Cheat',
          cheats: [
            {
              type: 'DustAllCardsInHand',
              player: player
            }
          ]
        })
      },
      {
        title: 'ui.cheats.dustDeck',
        playerAction: player => ({
          type: 'Cheat',
          cheats: [
            {
              type: 'DustAllCardsInDeck',
              player: player
            }
          ]
        })
      },
      {
        title: 'ui.cheats.dustGrave',
        playerAction: player => ({
          type: 'Cheat',
          cheats: (store.state?.playerCards[player].graveyard ?? []).map<Cheat>(
            id => ({
              type: 'DustCardThroughLimboFirst',
              card: {
                id
              }
            })
          )
        })
      },
      {
        title: 'ui.cheats.dustField',
        playerAction: player => ({
          type: 'Cheat',
          cheats: (store.state?.playerCards[player].field ?? []).map(id => ({
            type: 'DustCardThroughLimboFirst',
            card: {
              id
            }
          }))
        })
      },
      {
        title: 'ui.cheats.changeMaxMana',
        playerAction: changeMaxMana
      },
      {
        title: 'ui.cheats.summonUnits',
        playerAction: p => summonUnits(p, i18n.t('ui.cheats.summonUnits'))
      },

      {
        title: 'ui.cheats.drawCard',
        playerAction: player => ({
          type: 'Cheat',
          cheats: [{ type: 'DrawCard', player }]
        })
      },
      {
        title: 'ui.cheats.setHero',
        playerAction(player) {
          const prisms = prompt(
            'Enter a hero or a Deck Class e.g. Ada, Bouran, STW, INT.\nWARNING: This will reset the sandbox!'
          )?.toUpperCase()
          if (!prisms) {
            return
          }
          const deckClass =
            HERO_DECKCLASS[prisms as Hero] ??
            (prisms in DeckClass ? DeckClass[prisms as DeckClass] : null)
          if (!deckClass) {
            alert('Invalid prisms ' + prisms)
            return
          }
          changeUrlParamWithoutReload('serializedGameQuickSlotSelector', '')
          changeUrlParamAndReload(
            player === store.player! ? 'deck' : 'botDeck',
            `SWx${deckClass}02`
          )
        }
      },
      { id: 'resolutiondiv', divider: true },
      {
        title: 'ui.cheats.toggleEffectResolution',
        enabled: game => game.state.effectResolutionEnabled,
        toggle: active => ({
          type: 'Cheat',
          cheats: [
            {
              type: 'EffectResolutionActive',
              active
            }
          ]
        })
      },
      {
        title: 'ui.cheats.toggleDeathCleanup',
        enabled: game => game.state.deathCleanupEnabled,
        toggle: active => ({
          type: 'Cheat',
          cheats: [
            {
              type: 'DeathCleanupActive',
              active
            }
          ]
        })
      },
      {
        title: 'ui.cheats.toggleAuraUpdate',
        enabled: game => game.state.auraUpdateEnabled,
        toggle: active => ({
          type: 'Cheat',
          cheats: [
            {
              type: 'AuraUpdateActive',
              active
            }
          ]
        })
      },
      {
        niceBoolean: showCauseAndEffect
      },
      { id: 'botdiv', divider: true },
      ...(gameMode !== LocalGameMode.SANDBOX
        ? [
            {
              title: 'ui.cheats.hideCheatsMenu' as const,
              nonGameAction: () => {
                this.sidebar.close()
                this.fadeOut()
              }
            }
          ]
        : []),
      {
        title: 'ui.cheats.exportMacros',
        nonGameAction: () => {
          downloadJson(JSON.stringify(this.macros), 'opensky_macros.json')
        }
      },
      {
        title: 'ui.cheats.importMacros',
        nonGameAction: async () => {
          try {
            const macros = await uploadJson()
            if (!Array.isArray(macros)) {
              throw new Error('invalid macros json')
            }
            this.macros = macros
            this.saveMacros()
            window.location.reload()
          } catch (err) {
            console.warn(err)
          }
        }
      },
      {
        title: 'ui.cheats.exportKeybinds',
        nonGameAction: () => {
          downloadJson(
            JSON.stringify([...this.keybinds.entries()]),
            'opensky_keybinds.json'
          )
        }
      },
      {
        title: 'ui.cheats.importKeybinds',
        nonGameAction: async () => {
          try {
            const keybinds = await uploadJson()
            if (!Array.isArray(keybinds)) {
              throw new Error('invalid keybinds json')
            }
            if (keybinds[0].length !== 2) {
              throw new Error('invalid keybinds json')
            }
            this.keybinds = new Map(keybinds)
            this.saveKeybinds()
            window.location.reload()
          } catch (err) {
            console.warn(err)
          }
        }
      }
    ]
    for (const item of items) {
      const b: BindableCheatsItem = item
      if ('action' in b) {
        const act = b.action
        b.action = () => this.recordMacroOrApplyAction(act())
      } else if ('playerAction' in b) {
        const act = b.playerAction
        b.playerAction = p => this.recordMacroOrApplyAction(act(p))
      }
      const id = getCheatsItemID(b)
      b.defaultBinding =
        this.keybinds.get(id) ?? this.keybinds.has(id + 'p0')
          ? [this.keybinds.get(id + 'p0'), this.keybinds.get(id + 'p1')]
          : undefined
      b.onKeyBound = (i, k, c) => this.onKeyBound(i, k!, c)

      this.sidebar.createRow(item)
    }

    this.macroPanel = new SlideOutSidebar<
      BindableCheatsItem,
      string,
      CheatsRow
    >(SidebarPosition.Left, CheatsRow, row => row.item, getCheatsItemID, {
      addToBottom: true,
      xOffset: SIDEBAR_WIDTH,
      occupiesSide: false,
      itemSorter(a, b) {
        return +!!a.item.requiresTarget - +!!b.item.requiresTarget
      }
    })
    this.add(this.macroPanel)
    putChildAtBottom(this.macroPanel)

    this.sidebar.onToggle(status => {
      if (
        this.macroPanelOpen &&
        (status === SidebarStatus.Revealed ||
          status === SidebarStatus.Revealing)
      ) {
        this.macroPanel.open()
      } else {
        this.macroPanel.close()
      }
    })

    this.macroPanel.onToggle(status => {
      const open =
        status === SidebarStatus.Revealed || status === SidebarStatus.Revealing
      closeButton.mesh.matrix.anchor.x.offset = -SIDEBAR_WIDTH * (open ? 2 : 1)
    })

    this.macroPanel.createRow(
      {
        title: 'ui.cheats.recordNewMacro',
        nonGameAction: () => this.toggleRecordingMacro()
      },
      true
    )
    this.loadMacros()

    if (import.meta.hot) {
      if (import.meta.hot.data.sideBarOpen) {
        this.sidebar.toggle()
      }

      if (import.meta.hot.data.macroPanelOpen) {
        this.macroPanel.toggle()
      }
    }
  }
  toggleRecordingMacro(): void {
    if (this.recordingMacroUI) {
      this.teardownRecordingMacroUI()
    } else {
      this.startRecordingMacro()
    }
  }
  teardownRecordingMacroUI(): void {
    if (!this.recordingMacroUI) {
      return
    }
    this.recordingMacroUI.removeFromParent()
    this.macroPanel.removeRow(recordingRow)
    this.recordingMacroUI = undefined
    this.macroPanel.makeDirty()
  }
  startRecordingMacro(): void {
    if (this.recordingMacroUI) {
      return
    }
    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    backgroundMesh.matrix.setColor(new Color('red'), 0.5)
    this.macroPanel.add(backgroundMesh)
    this.macroPanel.createRow(recordingRow)
    this.recordingMacroUI = backgroundMesh
    this.macroPanel.makeDirty()
  }

  async getCardCheatContext(action: CardCheat<any>, partialContext: any) {
    const res = Object.entries(partialContext)
    if ('getContext' in action) {
      for (const [key, getValue] of Object.entries(action.getContext)) {
        if (key in partialContext) {
          continue
        }
        const value = await getValue()
        if (value === '?') {
          continue
        }
        res.push([key, value])
      }
    }
    return Object.fromEntries(res)
  }
  async recordMacroOrApplyAction(
    action: void | PlayerAction | CardCheat<any>,
    partialContext: { [index: string]: any } = {},
    card?: RelaxedCardInstance,
    zone?: CardStatus
  ) {
    if (!action) {
      return
    }
    if ('run' in action) {
      const context = await this.getCardCheatContext(action, partialContext)
      const c =
        this.cardUnderPointer ?? (card && zone)
          ? ([card!, zone!] as const)
          : undefined
      if (c) {
        const playerAction = action.run(c[0], c[1], context)
        if (!this.recordingMacroUI) {
          takeAction(playerAction)
          return
        }
        // we're recording a macro!
        const title = prompt('Name this macro')
        if (title) {
          this.addMacro(title, {
            id: action.title,
            context
          })
        }
        this.teardownRecordingMacroUI()
      }
    } else {
      if (!this.recordingMacroUI) {
        takeAction(action)
        return
      }

      // we're recording a macro!
      const title = prompt('Name this macro')
      if (title) {
        this.addMacro(title, action)
      }
      this.teardownRecordingMacroUI()
    }
  }

  async fadeIn(duration?: number) {
    if (!areCheatsEnabled()) {
      return
    }
    await super.fadeIn(duration)
  }

  private addMacro(
    title: string,
    action:
      | PlayerAction
      | {
          id: TFuncKey
          context: { [index: string]: any }
        },
    id: string = `${Math.random()}`
  ): void {
    try {
      const cardCheat =
        'context' in action
          ? cardCheats.find(c => c.title === action.id) ??
            (() => {
              throw "can't find original cheat"
            })()
          : undefined

      this.macroPanel.createRow({
        id,
        title: title as any,
        action: async () => {
          if ('context' in action) {
            if (!this.cardUnderPointer) {
              return
            }
            const [c, s] = this.cardUnderPointer
            const ctx = await this.getCardCheatContext(
              cardCheat!,
              action.context
            )
            const playerAction = cardCheat!.run(c, s, ctx)
            takeAction(playerAction)
          } else {
            takeAction(action)
          }
        },
        ...('context' in action ? { requiresTarget: true } : {}),

        defaultBinding: this.keybinds.get(id),
        onKeyBound: (_, k, cb) => this.onKeyBound(id, k!, cb),
        onDelete: () => this.deleteMacro(id)
      })

      this.macros.push({ id, title, action })
      this.saveMacros()
    } catch (warning) {
      console.warn(warning)
    }
  }
  private deleteMacro(id: string) {
    removeFromArrayByPredicate(this.macros, m => m.id === id)
    this.macroPanel.removeRow(id)
    this.onKeyBound(id, null)
    this.saveMacros()
  }

  private saveMacros() {
    localStorage.setItem(MACROS_LOCALSTORAGE_KEY, JSON.stringify(this.macros))
  }

  private loadMacros() {
    this.macros = []
    const macros = JSON.parse(
      localStorage.getItem(MACROS_LOCALSTORAGE_KEY) ?? '[]'
    )
    for (const { title, action, id } of macros) {
      this.addMacro(title, action, id)
    }
  }

  private saveKeybinds() {
    localStorage.setItem(
      KEYBINDS_LOCALSTORAGE_KEY,
      JSON.stringify([...this.keybinds.entries()])
    )
    console.log('saved keybinds', [...this.keybinds.entries()])
  }

  private loadKeybinds() {
    this.keybinds = new Map(
      JSON.parse(localStorage.getItem(KEYBINDS_LOCALSTORAGE_KEY) ?? '[]')
    )
    this.keybindCallbacks = new Map()
    console.log('loaded keybinds', [...this.keybinds.entries()])
  }
  private onKeyBound(id: string, key: KeyboardKey, cb: () => void): void
  private onKeyBound(id: string, key: null): void
  private onKeyBound(
    id: string,
    key: KeyboardKey | null,
    cb?: () => void
  ): void {
    if (key) {
      if (!cb) {
        throw new Error('missing callback')
      }
      this.keybinds.set(id, key)
      this.keybindCallbacks.set(id, cb)
      keyboard.listenToKey(key, cb)
    } else {
      const key = this.keybinds.get(id)
      const cb = this.keybindCallbacks.get(id)
      this.keybinds.delete(id)
      this.keybindCallbacks.delete(id)
      if (key && cb) {
        keyboard.stopListeningToKey(key, cb)
      }
    }
    this.saveKeybinds()
  }
}

const KEYBINDS_LOCALSTORAGE_KEY = 'cheats.keybinds.serialized'
const MACROS_LOCALSTORAGE_KEY = 'cheats.macros.serialized'

// https://gist.github.com/arilotter/21ac3638d25835e925e4c9a18369aef3
// https://gist.githubusercontent.com/{user}/{gist_hash}/raw/{file}

const recordingRow: BindableCheatsItem = {
  header: 'ui.cheats.recordingMessage'
}
