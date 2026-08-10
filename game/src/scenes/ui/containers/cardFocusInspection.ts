import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { clamp01 } from '@opensky/shared/utils/math'
import { Player } from '@skyweaver/state-metadata'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DEEP_LILAC, COLOR_WHITE } from '~/colors/colorLibrary'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { PALETTE_ROW, TIPS_BOX_WIDTH } from '~/constants'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import CardAspectInfoBoxes, {
  makeCardAspectInfoBoxes
} from '~/meshes/CardAspectInfoBoxes'
import GlobalEffectBoxes, {
  makeGlobalEffectBoxes
} from '~/meshes/GlobalEffectBoxes'
import LoreBoxes from '~/meshes/LoreBoxes'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import { removeFromParent } from '~/utils/threeUtils'
import { createButton, createButtonIcon, createOverlay } from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import PinnedButton from '../components/PinnedButton'
import UIContainer from '../components/UIContainer'

const SWITCH_BUTTON_WIDTH = 79
const SWITCH_BUTTON_HEIGHT = 60
const MARGIN = 2
const X_OFFSET = -SWITCH_BUTTON_WIDTH
const Y_OFFSET = 100

const __tempColor = new Color()
export default class CardFocusInspectionContainer extends UIContainer {
  ticks: Mesh2D[] = []
  pins: Pin[] = []
  infoButton: PinnedButton
  metadataButton: PinnedButton
  virtualIndex: number = 0

  _mode: 'tips' | 'lore' | 'hero' = 'tips'

  container: Object2D

  infoBoxContainer: Object2D
  cardMetaInfo: CardAspectInfoBoxes | LoreBoxes | null = null
  cardInfoBoxes: CardAspectInfoBoxes | null = null
  cardLoreBoxes: LoreBoxes | null = null
  globalEffectBoxes: GlobalEffectBoxes | null = null

  tickBoxContainer: Object2D
  private _tickSize: number
  cardBackButton: PinnedButton
  globalEffectsButton: PinnedButton
  constructor(ui: UI, priority: number) {
    super(ui, 'CardFocusInspection', {
      priority,
      closeOnEscape: true
    })
  }
  get mode() {
    return this._mode
  }
  setMode(mode: 'tips' | 'lore' | 'hero') {
    this._mode = mode
    const forcedMode = this.infoButton.disabled ? 'lore' : mode
    this.infoButton.selected = forcedMode === 'tips'
    this.metadataButton.selected = forcedMode === 'lore'
    this.globalEffectsButton.selected = forcedMode !== 'lore'

    if (mode === 'hero' && this.globalEffectBoxes) {
      this.globalEffectBoxes.visible = true
      if (this.cardInfoBoxes) {
        this.cardInfoBoxes.visible = false
      }
      if (this.cardLoreBoxes) {
        this.cardLoreBoxes.visible = false
      }
    } else {
      if (this.globalEffectBoxes) {
        this.globalEffectBoxes.visible = false
      }
      if (forcedMode === 'tips' && this.cardInfoBoxes && this.cardLoreBoxes) {
        this.cardInfoBoxes.visible = true
        this.cardLoreBoxes.visible = false
      } else if (
        forcedMode === 'lore' &&
        this.cardInfoBoxes &&
        this.cardLoreBoxes
      ) {
        this.cardInfoBoxes.visible = false
        this.cardLoreBoxes.visible = true
      }
    }
  }
  protected init() {
    createOverlay(
      this,
      () => {
        world.getSystem(CardFocusInspectionSystem).setFocusedCard(null)
        world.getSystem(CardFocusInspectionSystem).showCardback.value = false
      },
      undefined,
      0.945
    )
    this.container = new Object2D()
    this.infoBoxContainer = new Object2D()
    this.tickBoxContainer = new Object2D()
    this.add(this.container)
    this.add(this.tickBoxContainer)
    this.container.add(this.infoBoxContainer)

    this.cardBackButton = createButton(
      this.container,
      () => {
        world.getSystem(CardFocusInspectionSystem).flipCards()
      },
      Pin.fromPixels(SWITCH_BUTTON_WIDTH, SWITCH_BUTTON_HEIGHT),
      ReadonlyPin.Left,
      ReadonlyPin.TopLeft.cloneOffset(X_OFFSET, -MARGIN + Y_OFFSET)
    )
    this.cardBackButton.basePaletteRow = PALETTE_ROW.PURPLE

    createButtonIcon(
      this.cardBackButton.mesh,
      'ui-icon-flip-card'
    ).matrix.prescale = new Vector2(1.7, 1.7)

    this.infoButton = createButton(
      this.container,
      () => {
        this.setMode('tips')
      },
      Pin.fromPixels(SWITCH_BUTTON_WIDTH, SWITCH_BUTTON_HEIGHT),
      ReadonlyPin.Left,
      ReadonlyPin.TopLeft.cloneOffset(
        X_OFFSET,
        SWITCH_BUTTON_HEIGHT + MARGIN + Y_OFFSET
      )
    )
    this.infoButton.basePaletteRow = PALETTE_ROW.PURPLE
    this.infoButton.selected = true
    createButtonIcon(this.infoButton.mesh, 'ui-icon-menu').matrix.prescale =
      new Vector2(1.7, 1.7)
    this.globalEffectsButton = createButton(
      this.container,
      () => {
        this.setMode('hero')
      },
      Pin.fromPixels(SWITCH_BUTTON_WIDTH, SWITCH_BUTTON_HEIGHT),
      ReadonlyPin.Left,
      ReadonlyPin.TopLeft.cloneOffset(
        X_OFFSET,
        SWITCH_BUTTON_HEIGHT + MARGIN + Y_OFFSET
      )
    )
    this.globalEffectsButton.basePaletteRow = PALETTE_ROW.PURPLE
    this.globalEffectsButton.selected = true
    this.globalEffectsButton.mesh.visible = false
    createButtonIcon(
      this.globalEffectsButton.mesh,
      'trigger-icon-aura'
    ).matrix.prescale = new Vector2(1.7, 1.7)

    this.metadataButton = createButton(
      this.container,
      () => {
        this.setMode('lore')
      },
      Pin.fromPixels(SWITCH_BUTTON_WIDTH, SWITCH_BUTTON_HEIGHT),
      ReadonlyPin.Left,
      ReadonlyPin.TopLeft.cloneOffset(
        X_OFFSET,
        2 * SWITCH_BUTTON_HEIGHT + 3 * MARGIN + Y_OFFSET
      )
    )
    this.metadataButton.basePaletteRow = PALETTE_ROW.PURPLE
    createButtonIcon(
      this.metadataButton.mesh,
      'ui-icon-scroll'
    ).matrix.prescale = new Vector2(1.7, 1.7)
    this.pins = []

    this._handleResize()
  }

  setTicks(numTicks: number) {
    for (const tick of [...this.ticks]) {
      removeFromParent(tick)
    }
    this.pins = []
    this.ticks = []

    if (numTicks <= 1) {
      return
    }
    const tickContainerWidth = (numTicks - 1) * (this._tickSize * 1.4)
    this.tickBoxContainer.matrix.setConstraints(
      new Pin(0, 0, tickContainerWidth, this._tickSize),
      ReadonlyPin.Center,
      ReadonlyPin.Bottom.cloneOffset(0, -100)
    )
    for (let i = 0; i < numTicks; i++) {
      const tickMesh = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'circle-filled-outline-inner'
      )
      const xoffset = i * this._tickSize * 1.4
      tickMesh.matrix.setConstraints(
        new SizePin(1, 1, 1, 'y'),
        ReadonlyPin.Center,
        ReadonlyPin.Left.cloneOffset(xoffset, 0),
        new Vector2(3, 3)
      )
      this.tickBoxContainer.add(tickMesh)
      // this.add(outline)

      this.ticks.push(tickMesh)
    }
    this.positionTicks()
  }

  setSelectedTick(index: number) {
    simpleTweener.to({
      description: 'anim progression tick color',
      target: this as CardFocusInspectionContainer,
      propertyGoals: { virtualIndex: index },
      duration: 150,
      onUpdate: () => {
        for (const tick of this.ticks) {
          const indexDelta = this.ticks.indexOf(tick) - this.virtualIndex
          const mix = clamp01(Math.abs(indexDelta))
          __tempColor.copy(COLOR_WHITE).lerp(COLOR_DEEP_LILAC, mix)
          tick.matrix.setColor(__tempColor)
        }
      }
    })
  }

  createInfoBoxes(card: RelaxedCardInstance, owner?: Player) {
    if (this.cardInfoBoxes) {
      removeFromParent(this.cardInfoBoxes)
    }
    if (this.cardLoreBoxes) {
      removeFromParent(this.cardLoreBoxes)
    }
    if (this.globalEffectBoxes) {
      removeFromParent(this.globalEffectBoxes)
    }
    let hasTooltips = false

    const infoBoxes = makeCardAspectInfoBoxes(
      [
        {
          base: card.base,
          traits: card.state.view.traits
        }
      ],
      TIPS_BOX_WIDTH,
      false // todo
    )
    if (infoBoxes) {
      this.infoBoxContainer.add(infoBoxes)
      let tooltipsHeightSum = 0
      for (const tooltip of infoBoxes.children) {
        if (tooltip instanceof Object2D) {
          tooltipsHeightSum += tooltip.matrix.size.y.offset
        }
      }
      const tooltipOffset = 65.33 - 0.393 * tooltipsHeightSum

      infoBoxes.matrix.setConstraints(
        new Pin(0, 1, TIPS_BOX_WIDTH, 0),
        ReadonlyPin.Top,
        ReadonlyPin.Top.cloneOffset(0, tooltipOffset)
      )
      hasTooltips = true
    }

    const lore = new LoreBoxes(card, TIPS_BOX_WIDTH)

    lore.matrix.setConstraints(
      new Pin(0, 1, TIPS_BOX_WIDTH, 0),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 0)
    )
    if (!hasTooltips) {
      this.infoButton.mesh.visible = false
      this.metadataButton.mesh.visible = false

      this.setMode('lore')
    } else {
      this.infoButton.mesh.visible = true
      this.metadataButton.mesh.visible = true
      this.setMode('tips')
    }
    this.globalEffectsButton.mesh.visible = false
    // if owner exists, this is for a hero card, and will need global effect boxes
    if (owner !== undefined) {
      const globalEffectBoxes =
        makeGlobalEffectBoxes(
          card,
          TIPS_BOX_WIDTH + (device.isMobile ? 20 : 50),
          true,
          owner as Player
        ) || null

      if (globalEffectBoxes) {
        let tooltipsHeightSum = 0
        for (const tooltip of globalEffectBoxes.children) {
          if (tooltip instanceof Object2D) {
            tooltipsHeightSum += tooltip.matrix.size.y.offset
          }
        }
        const tooltipOffset = 65.33 - 0.393 * tooltipsHeightSum

        globalEffectBoxes.matrix.setConstraints(
          new Pin(0, 1, TIPS_BOX_WIDTH, 0),
          ReadonlyPin.Top,
          ReadonlyPin.Top.cloneOffset(device.isMobile ? -5 : -20, tooltipOffset)
        )
        const hasTooltips = !!globalEffectBoxes.children.length
        this.infoButton.mesh.visible = false
        this.metadataButton.mesh.visible = true
        this.globalEffectsButton.mesh.visible = true
        if (!hasTooltips) {
          this.setMode('lore')
        } else {
          this.setMode('hero')
        }
        this.infoBoxContainer.add(globalEffectBoxes)
        this.globalEffectBoxes = globalEffectBoxes
      }
    }
    this.cardInfoBoxes = infoBoxes || null
    this.cardLoreBoxes = lore

    this.infoBoxContainer.add(lore)
    this.setMode(this.mode)
  }

  show() {
    super.show()
    this._handleResize()
  }

  async fadeOut() {
    if (this.active) {
      world.getSystem(CardFocusInspectionSystem).setFocusedCard(null)
    }
    await super.fadeOut(0)
  }
  protected _handleResize() {
    super._handleResize()
    if (!this.visible) {
      return
    }
    this._tickSize = Math.min(renderMetrics.height * 0.05, 25)
    if (this.positionTicks) {
      this.positionTicks()
    }

    if (this.container && this.infoBoxContainer) {
      this.container.matrix.setConstraints(
        new Pin(0.3, 0.7),
        ReadonlyPin.TopLeft,
        new Pin(0.07, 0.27)
      )
      this.infoBoxContainer.matrix.prescale = new Vector2(1.3, 1.3)
    }
  }

  positionTicks = () => {
    if (this.ticks === undefined) {
      return
    }
    const tickPin = ReadonlyPin.Bottom.cloneOffset(
      0,
      -this._tickSize * (device.isMobile ? 1.5 : 4)
    )
    this.tickBoxContainer.matrix.offset = tickPin
  }
}
