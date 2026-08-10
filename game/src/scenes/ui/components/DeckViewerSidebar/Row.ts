import { translate } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { uiScale } from '@opensky/shared/userSettings'
import { lerp } from '@opensky/shared/utils/math'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import {
  CardLibrary,
  Element,
  IndexSet,
  Trait
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Mesh, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { TextureType } from '~/assets/TextureType'
import { getCardCache } from '~/cardCache'
import { tryCreateCheatsContextMenu } from '~/cheats/cheats'
import {
  cardTypeColors,
  COLOR_DEBUG_RED,
  COLOR_DEEP_LILAC,
  COLOR_PALE_BUFFED_TEXT,
  COLOR_PALE_NERFED_TEXT,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { Components } from '~/components'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import HostingAttachmentComponent from '~/components/HostingAttachmentComponent'
import TransformComponent from '~/components/TransformComponent'
import { elementColors, lineworkSettingsLib, SIDEBAR_WIDTH } from '~/constants'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import { putChildAtBottom } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import { createWorldEntity, removeWorldEntity } from '~/helpers/worldHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import inputProvider from '~/systems/input/input'
import TextMesh, { TextSegment } from '~/systems/text/TextMesh'
import {
  makeCostNumberEffect,
  makeCostNumberShadowEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { get2DPositionAtDepth, toClipX } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import ColliderMesh from '~/utils/ColliderMesh'
import { NOOP } from '~/utils/jsUtils'
import { PPM } from '~/utils/measurements'
import {
  cardTypeSymbols,
  elementSymbols,
  fontIconSymbols
} from '~/utils/symbolLibs'
import { removeFromParent } from '~/utils/threeUtils'
import { world } from '~/world'

import {
  ROW_HEIGHT,
  ROW_WIDTH,
  SidebarPosition,
  SidebarStatus
} from '../SlideOutSidebar/constants'
import { SidebarRow, SlideOutSidebar } from '../SlideOutSidebar/SlideOutSidebar'

const __secondaryIconTextOptions: Partial<textOptions.TextOptions> = {
  align: 'right',
  vAlign: 'center',
  size: 22
}

const NBSP = ' '

let __rowCounter = 0
function __nextRowId() {
  return __rowCounter++
}
const HARDCODE_ROWART_PRESCALE = 1.2523

const __buffIconText = fontIconSymbols.Buff + NBSP
const __debuffIconText = fontIconSymbols.Debuff + NBSP

export default class Row extends Object2D implements IInteractive, SidebarRow {
  name = 'sidebar-row'
  private _secondaryIcons: UITextMesh
  private _secondaryIconsShadow: UITextMesh
  private _hasBuffIcon: boolean
  private _element: Element
  get hasBuffIcon(): boolean {
    return this._hasBuffIcon
  }
  set hasBuffIcon(value: boolean) {
    if (this._hasBuffIcon !== value) {
      this._hasBuffIcon = value
      this.updateSecondaryIcons()
    }
  }
  private _hasDebuffIcon: boolean
  get hasDebuffIcon(): boolean {
    return this._hasDebuffIcon
  }
  set hasDebuffIcon(value: boolean) {
    if (this._hasDebuffIcon !== value) {
      this._hasDebuffIcon = value
      this.updateSecondaryIcons()
    }
  }
  private updateSecondaryIcons() {
    const cardElementIcon = elementSymbols[this._element]

    const secondaryIconsSegs: TextSegment[] = [
      { text: cardElementIcon, color: elementColors[this._element] },
      { text: '', color: COLOR_DEBUG_RED }
    ]
    const secondaryIconsShadowChars = [cardElementIcon]
    if (this.hasDebuffIcon) {
      secondaryIconsSegs.unshift({
        text: __debuffIconText,
        color: COLOR_PALE_NERFED_TEXT
      })
      secondaryIconsShadowChars.unshift(__debuffIconText)
    }
    if (this.hasBuffIcon) {
      secondaryIconsSegs.unshift({
        text: __buffIconText,
        color: COLOR_PALE_BUFFED_TEXT
      })
      secondaryIconsShadowChars.unshift(__buffIconText)
    }
    this._secondaryIcons.text = secondaryIconsSegs
    this._secondaryIconsShadow.text = secondaryIconsShadowChars.join('')
  }
  contents = new Object2D()
  dimmer: AnimatedBool
  private _entity: Entity<Components>
  cursor: CursorType = 'pointer'
  rowId = __nextRowId()
  manaTexts: TextMesh[] = []
  manaUnbind: () => void = NOOP

  private banner: Mesh
  private onElementChanged = (newElement: Element) => {
    this._element = newElement
    this.regenerateBanner()
    this.updateSecondaryIcons()
  }
  private onHealthChanged = () => {
    const card = this._entity.get('cardInstance')
    const standardCard = CardLibrary.get(card.base)!
    this._hasHealthBuff = Boolean(
      typeof card.state.view.health === 'number' &&
        standardCard.health &&
        card.state.view.health > standardCard.health
    )
    this._hasHealthDebuff = Boolean(
      typeof card.state.view.health === 'number' &&
        standardCard.health &&
        card.state.view.health < standardCard.health
    )
    this.onBuffNerfChanged()
  }
  private onPowerChanged = () => {
    const card = this._entity.get('cardInstance')
    const standardCard = CardLibrary.get(card.base)!
    this._hasPowerBuff = Boolean(
      typeof card.state.view.power === 'number' &&
        standardCard.power &&
        card.state.view.power > standardCard.power
    )
    this._hasPowerDebuff = Boolean(
      typeof card.state.view.power === 'number' &&
        standardCard.power &&
        card.state.view.power < standardCard.power
    )
    this.onBuffNerfChanged()
  }
  private onTraitsChanged = (
    newTraits: IndexSet<Trait>,
    oldTraits: IndexSet<Trait> = []
  ) => {
    let different = false
    for (const trait of newTraits) {
      if (!oldTraits.includes(trait)) {
        different = true
      }
    }
    for (const trait of oldTraits) {
      if (!oldTraits.includes(trait)) {
        different = true
      }
    }
    if (different) {
      const card = this._entity.get('cardInstance')
      const standardCard = CardLibrary.get(card.base)!
      for (const trait of card.state.view.traits) {
        if (!standardCard.traits.includes(trait)) {
          this._hasTraitBuff = true
        }
      }
      for (const trait of standardCard.traits) {
        if (!card.state.view.traits.includes(trait)) {
          this._hasTraitDebuff = true
        }
      }
      this.onBuffNerfChanged()
    }
  }

  private onBuffNerfChanged = () => {
    const muteIcons = this.dim || this.sidebar.side !== SidebarPosition.Right
    let hasBuff =
      !muteIcons &&
      (this._hasTraitBuff || this._hasHealthBuff || this._hasPowerBuff)
    let hasDebuff =
      !muteIcons &&
      (this._hasTraitDebuff || this._hasHealthDebuff || this._hasPowerDebuff)

    if (queryParams.testBuffIcons) {
      hasBuff = Math.random() > 0.5
      hasDebuff = Math.random() > 0.5
    }
    this.hasBuffIcon = hasBuff
    this.hasDebuffIcon = hasDebuff
  }
  regenerateBannerOnOpen: boolean
  private _hasTraitBuff: boolean
  private _hasTraitDebuff: boolean
  private _hasHealthBuff: boolean
  private _hasHealthDebuff: boolean
  private _hasPowerBuff: boolean
  private _hasPowerDebuff: boolean

  get dim() {
    return this.dimmer.value
  }

  set dim(val: boolean) {
    if (this.dimmer.value !== val) {
      this.dimmer.value = val
      this.regenerateBanner()
    }
  }

  constructor(
    private sidebar: SlideOutSidebar<unknown, unknown, any>,
    cardInstanceComponent: CardInstanceComponent
  ) {
    super()
    this.contents.name = 'sidebar-row-contents'
    this.add(this.contents)
    this.dimmer = new AnimatedBool(
      v => {
        const b = lerp(1, 0.3, v)
        this.matrix.setColorRGB(b, b, b)
      },
      false,
      200
    )
    const collider = new ColliderMesh(this, -1)
    collider.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    collider.userData.button = this
    // collider.scale.set(, 1)
    this.userData.collider = collider
    // collider.position.set(-ROW_WIDTH / 2, -ROW_HEIGHT / 2, 2)
    const cardMeta = CardLibrary.get(cardInstanceComponent.value.base)!
    const cardName = translate.card.name(cardInstanceComponent.value.base)!

    // create an unbound entity - not attached to world.
    this._entity = new Entity([cardInstanceComponent])

    // XXX Timing issue regarding TransformComponent and the defaultScene
    setTimeout(() => {
      this._entity.add(new TransformComponent())
    }, 1)

    const cardTypeIcon = cardTypeSymbols[cardMeta.type]
    const labelLeft = new UITextMesh(
      [
        { text: cardTypeIcon + ' ', color: cardTypeColors[cardMeta.type] },
        { text: cardName, color: COLOR_WHITE, xOffset: 2 }
      ],
      {
        ...textOptions.cardName,
        align: 'left',
        vAlign: 'center',
        size: 19
      },
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    labelLeft.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(39, -1.5)
    )

    const cardElementIcon = elementSymbols[cardMeta.element]
    const secondaryIconsShadow = new UITextMesh(
      cardElementIcon,
      {
        ...textOptions.rowIconsShadow,
        ...__secondaryIconTextOptions
      },
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    const secondaryIconsOffset = new Vector2(-22, -5)
    secondaryIconsShadow.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(
        secondaryIconsOffset.x,
        secondaryIconsOffset.y
      )
    )

    const secondaryIcons = new UITextMesh(
      [
        { text: '', color: COLOR_DEEP_LILAC },
        { text: cardElementIcon, color: elementColors[cardMeta.element] }
      ],
      {
        ...textOptions.rowIcons,
        ...__secondaryIconTextOptions
      },
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    secondaryIcons.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(
        secondaryIconsOffset.x - 2.1,
        secondaryIconsOffset.y + 4.25
      )
    )

    this._secondaryIcons = secondaryIcons
    this._secondaryIconsShadow = secondaryIconsShadow

    const manaGem = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'mana-gem',
      true
    )
    if (manaGem) {
      manaGem.matrix.setConstraints(
        new Pin(0, 0),
        ReadonlyPin.Left,
        ReadonlyPin.Left.cloneOffset(21, 0)
      )
    }
    const gemTextOffset = new Vector2(21, 23)
    const manaTexts = [
      {
        style: textOptions.cardManaCostShadow,
        offsetY: -3.5,
        effect: makeCostNumberShadowEffect
      },
      {
        style: textOptions.cardManaCost,
        offsetY: 0,
        effect: makeCostNumberEffect
      }
    ]
    manaTexts.forEach((layer, idx) => {
      const effect = layer.effect(cardMeta.cost)

      const manaText = new UITextMesh(
        '0',
        { ...layer.style, align: 'center', scaleDownToPhysicalSize: false },
        undefined,
        undefined,
        effect,
        undefined,
        false
      )
      manaText.matrix.setConstraints(
        ReadonlyPin.EmptySize,
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.cloneOffset(
          gemTextOffset.x,
          gemTextOffset.y + layer.offsetY
        )
      )

      manaText.name = 'RowManaText:' + idx
      manaText.onAdd()
      this.manaTexts.push(manaText)
    })

    this.updateCostBinding()

    const card = cardInstanceComponent.value
    const cardView = card.state.view

    listenToProperty(cardView, 'element', this.onElementChanged, true)
    if (cardMeta.type === 'unit') {
      listenToProperty(cardView, 'health', this.onHealthChanged, true)
      listenToProperty(cardView, 'power', this.onPowerChanged, true)
    }
    listenToProperty(cardView, 'traits', this.onTraitsChanged, true)

    this.matrix.setConstraints(
      Pin.fromPixels(SIDEBAR_WIDTH, ROW_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
    this.contents.add(manaGem)
    for (const manaText of this.manaTexts) {
      this.contents.add(manaText)
    }
    this.contents.add(labelLeft)
    this.contents.add(secondaryIconsShadow)
    this.contents.add(secondaryIcons)
    this.contents.add(collider)
  }
  updateCostBinding() {
    this.manaUnbind()

    const cardMeta = CardLibrary.get(this._entity.get('cardInstance').base)!
    const isXCost = cardMeta.cost === 'X'

    // If we're an X-cost card, always show 'X' in the deck & grave viewers.
    // otherwise, this will be migrated to the correct object when it changes by migrateLiveProp.
    const objToReadCostFrom = isXCost
      ? { cost: 'X' }
      : this._entity.get('cardInstance').state.view

    const onCostChange = (cost: string | number) => {
      this.sidebar.makeDirty()
      this.manaTexts.forEach(text => text.updateText(cost))
    }

    listenToProperty(objToReadCostFrom, 'cost', onCostChange, true)
    this.manaUnbind = () => {
      stopListeningToProperty(objToReadCostFrom, 'cost', onCostChange)
    }
  }

  regenerateBanner() {
    if (
      this.sidebar.status === SidebarStatus.Hidden ||
      this.sidebar.status === SidebarStatus.Hiding
    ) {
      this.regenerateBannerOnOpen = true
      return
    }
    this.regenerateBannerOnOpen = false

    const card = this._entity.get('cardInstance')
    if (this.banner) {
      removeFromParent(this.banner)
    }
    const standardCard = CardLibrary.get(card.base)!
    const isUnit = standardCard.type === 'unit'
    const fgUrl = `game/cards/art-rows/${isUnit ? 'units' : 'spells'}/${
      standardCard.artSlug
    }.png`

    const rowDesktopPrototype = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesGraphical',
      'row-desktop'
    ) as Mesh2D
    let lineworkSettings
    const rarity = card.state.view.rarity
    if (rarity === 'gold') {
      lineworkSettings = lineworkSettingsLib.rowGold
    } else if (rarity === 'silver') {
      lineworkSettings = lineworkSettingsLib.rowSilver
    } else {
      lineworkSettings = lineworkSettingsLib.rowDesktop
    }

    const banner = setupRowArt(
      rowDesktopPrototype,
      card.state.view.element,
      fgUrl,
      lineworkSettings.overrideColor,
      lineworkSettings.deepenColor,
      TextureType.SmallUI
    )
    banner.matrix.setConstraints(
      Pin.fromPixels(
        215 * HARDCODE_ROWART_PRESCALE,
        32 * HARDCODE_ROWART_PRESCALE
      ),
      ReadonlyPin.Center.cloneOffset(-0.0014, 0.0001),
      ReadonlyPin.Center,
      new Vector2(
        PPM * HARDCODE_ROWART_PRESCALE,
        PPM * HARDCODE_ROWART_PRESCALE
      )
    )
    this.banner = banner
    this.contents.add(banner)
    putChildAtBottom(banner)
    banner.updateWorldMatrix(false, true)
  }

  teardown() {
    // We remove the live prop listeners so we don't leak it
    const cardView = this._entity.get('cardInstance').state.view
    stopListeningToProperty(cardView, 'health', this.onHealthChanged)
    stopListeningToProperty(cardView, 'power', this.onPowerChanged)
    stopListeningToProperty(cardView, 'traits', this.onTraitsChanged)
    stopListeningToProperty(cardView, 'element', this.onElementChanged)
  }

  get entityWithAttachment() {
    const card = getCardCache().getEntity(this._entity.get('cardInstance'))
    if (this._entity.has('hostingAttachment')) {
      const fakeAttachEntity = this._entity.get('hostingAttachment').entity
      removeWorldEntity(fakeAttachEntity.id)
      this._entity.remove('hostingAttachment')
    }
    this._entity.remove('hostingAttachment')
    const ha = card?.getComponent('hostingAttachment')
    if (ha) {
      const attachInstance = ha.value.entity.has('cardInstance')
        ? ha.value.entity.get('cardInstance')
        : null
      if (attachInstance) {
        const fakeAttachmentEntity = createWorldEntity([
          new CardInstanceComponent(attachInstance)
        ])
        this._entity.add(
          new HostingAttachmentComponent(fakeAttachmentEntity, NOOP)
        )
      }
    }
    return this._entity
  }

  get entity() {
    return this._entity
  }

  onSelect() {
    world
      .getSystem(CardFocusInspectionSystem)
      .setFocusedCard(this.entityWithAttachment)
  }

  onOver() {
    if (device.isDesktop) {
      if (!this.entityWithAttachment.has('transform')) {
        return
      }
      const transform = this.entityWithAttachment.get('transform')
      transform.position.copy(
        get2DPositionAtDepth(
          cameraShaker.camera,
          cameraShaker.cameraWorldPos,
          toClipX(
            this.sidebar.side === SidebarPosition.Left
              ? ROW_WIDTH - 40
              : renderMetrics.width - (ROW_WIDTH - 40)
          ),
          inputProvider.positionClipspace.y
        )
      )

      setHoveredCardAsync(
        this.entityWithAttachment,
        0,
        this.sidebar.side === SidebarPosition.Left ? 'right' : 'left',
        undefined,
        true
      )
    }
  }

  onOut() {
    if (device.isDesktop) {
      setHoveredCardAsync(undefined)
    }
  }

  onHoldStart() {
    if (device.useTouch && this.sidebar.status === SidebarStatus.Revealed) {
      const transform = this.entityWithAttachment.get('transform')

      transform.position.copy(
        get2DPositionAtDepth(
          cameraShaker.camera,
          cameraShaker.cameraWorldPos,
          toClipX(
            this.sidebar.side === SidebarPosition.Left
              ? ROW_WIDTH * uiScale.value
              : renderMetrics.width - ROW_WIDTH * uiScale.value
          ),
          inputProvider.positionClipspace.y
        )
      )

      setHoveredCardAsync(
        this.entityWithAttachment,
        0,
        this.sidebar.side === SidebarPosition.Left ? 'right' : 'left'
      )

      // If we're on a phone and we long-pressed this item, also pop up the cheats context menu
      tryCreateCheatsContextMenu(
        this.entityWithAttachment.get('cardInstance'),
        'Deck'
      )
    }
  }

  onRightPressEnd() {
    tryCreateCheatsContextMenu(
      this.entityWithAttachment.get('cardInstance'),
      'Deck'
    )
  }

  onHoldEnd() {
    if (device.useTouch) {
      setHoveredCardAsync(undefined)
    }
  }
}
