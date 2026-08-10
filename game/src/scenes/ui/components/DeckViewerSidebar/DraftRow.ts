import { translate } from '@opensky/language-manager'
import { lerp } from '@opensky/shared/utils/math'
import { CardLibrary, Element } from '@skyweaver/state-metadata'
import { Mesh, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { TextureType } from '~/assets/TextureType'
import {
  cardTypeColors,
  COLOR_DEBUG_RED,
  COLOR_DEEP_LILAC,
  COLOR_PALE_BUFFED_TEXT,
  COLOR_PALE_NERFED_TEXT,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { elementColors, lineworkSettingsLib, SIDEBAR_WIDTH } from '~/constants'
import { putChildAtBottom } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import IInteractive from '~/systems/input/IInteractive'
import TextMesh, { TextSegment } from '~/systems/text/TextMesh'
import {
  makeCostNumberEffect,
  makeCostNumberShadowEffect
} from '~/systems/text/textMeshEffects'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { DraftStateCard } from '~/tests/draftMockup/DraftState'
import { getCachedCardStateView } from '~/tests/draftMockup/getCachedCardStateView'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { NOOP } from '~/utils/jsUtils'
import { PPM } from '~/utils/measurements'
import {
  cardTypeSymbols,
  elementSymbols,
  fontIconSymbols
} from '~/utils/symbolLibs'
import { removeFromParent } from '~/utils/threeUtils'

import { ROW_HEIGHT } from '../SlideOutSidebar/constants'
import SimpleRow from './SimpleRow'

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

export default class DraftRow
  extends SimpleRow<DraftStateCard>
  implements IInteractive
{
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
  dimmer: AnimatedBool
  manaTexts: TextMesh[] = []
  manaUnbind: () => void = NOOP

  private banner: Mesh

  constructor(item: DraftStateCard) {
    super(item)
    this.dimmer = new AnimatedBool(
      v => {
        const b = lerp(1, 0.3, v)
        this.matrix.setColorRGB(b, b, b)
      },
      false,
      200
    )
    // collider.position.set(-ROW_WIDTH / 2, -ROW_HEIGHT / 2, 2)
    const cardName = translate.card.name(item.base)!

    // create an unbound entity - not attached to world.

    const cardView = getCachedCardStateView(item)

    const cardTypeIcon = cardTypeSymbols[cardView.state.view.type]
    const labelLeft = new UITextMesh(
      [
        {
          text: cardTypeIcon + ' ',
          color: cardTypeColors[cardView.state.view.type]
        },
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

    const cardElementIcon = elementSymbols[cardView.state.view.element]
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
        {
          text: cardElementIcon,
          color: elementColors[cardView.state.view.element]
        }
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
      const effect = layer.effect(cardView.state.view.cost)

      const manaText = new UITextMesh(
        cardView.state.view.cost,
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
    this.regenerateBanner()
  }

  regenerateBanner() {
    const card = this.item
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
    const rarity = card.rarity
    if (rarity === 'gold') {
      lineworkSettings = lineworkSettingsLib.rowGold
    } else if (rarity === 'silver') {
      lineworkSettings = lineworkSettingsLib.rowSilver
    } else {
      lineworkSettings = lineworkSettingsLib.rowDesktop
    }

    const cardView = getCachedCardStateView(card)

    const banner = setupRowArt(
      rowDesktopPrototype,
      cardView.state.view.element,
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
  }
}
