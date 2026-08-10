import { i18n, translate } from '@opensky/language-manager'
import {
  descriptionTokenColors,
  getParsedCardDescription,
  getTextSegmentsFromDescription
} from '@opensky/parse-card-description'
import { Trait, VocabOnCard } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets/index'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { getTexturedMesh2D } from '~/helpers/texturedMesh2D'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import Object2D from './Object2D'
import RectangleMesh from './RectangleMesh'

const ICON_SIZE = 50
const LABEL_X_OFFSET = -3
const LABEL_Y_OFFSET = 3
const TEXT_X_OFFSET = 8
const MARGIN = 10
const ICON_X_OFFSET = 8
const TRAIT_TO_PALETTEROW: { [K in Trait]: number } = {
  guard: 1,
  wither: 2,
  stealth: 3,
  armor: 4,
  lifesteal: 5,
  banner: 6,
  dash: 7
}
export default class CardAspectInfoBox extends Object2D {
  private _height: number
  private _icon: RectangleMesh | undefined
  private _inited = false
  constructor(
    public info: VocabOnCard,
    width: number,
    public onLayoutChanged?: () => void
  ) {
    super()
    this.matrix.size = Pin.fromPixels(width, 40)

    const isTrait = info.vocab.type === 'trait'
    const isTrigger = info.vocab.type === 'trigger'
    const needsLabel = isTrait || isTrigger

    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      needsLabel ? 'info-box-with-margin' : 'info-box',
      true,
      true
    )
    makeSuperOpaque(bg)

    const titleBar = needsLabel
      ? getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'info-box-title',
          true,
          true
        )
      : undefined

    if (titleBar) {
      bg.add(titleBar)
      titleBar.matrix.setConstraints(
        new Pin(0, 0, 0, 0),
        ReadonlyPin.TopRight,
        ReadonlyPin.TopRight
      )
    }

    this.add(bg)

    const updateLayout = () => {
      if (!this._inited) {
        return
      }
      const extraSpace = needsLabel ? 20 : 0
      const h = Math.max(ICON_SIZE + extraSpace, textMesh.height + MARGIN * 2)
      this._height = h
      this.matrix.size.y.offset = h
      if (this._icon) {
        this._icon.matrix.setConstraints(
          undefined,
          ReadonlyPin.BottomRight,
          ReadonlyPin.BottomRight.cloneOffset(
            ICON_X_OFFSET - MARGIN,
            (-(h - extraSpace) + ICON_SIZE - MARGIN / 2) / 2
          )
        )
      }

      if (this.onLayoutChanged) {
        this.onLayoutChanged()
      }
    }

    const parsedTitle = getTextSegmentsFromDescription(
      getParsedCardDescription(
        translate.vocab.title(info.vocabID as 'draw'),
        () => {
          throw new Error("Don't use card IDs in vocab!")
        },
        i18n.t
      )
    )
    const parsedBody = getTextSegmentsFromDescription(
      getParsedCardDescription(
        translate.vocab.text(info.vocabID as 'draw'),
        () => {
          throw new Error("Don't use card IDs in vocab!")
        },
        i18n.t
      )
    )

    const segments = [
      ...parsedTitle.map(item => {
        if (item.fontWeight) {
          item.fontWeight *= 1.5
        }
        if (item.color === descriptionTokenColors.normal) {
          item.color = 0xffffff
        }
        return item
      }),
      { text: ': ', color: 0xffffff, fontWeight: 1.3 },
      ...parsedBody.map(item => {
        if (
          item.fontWeight === 1 &&
          item.italicSkew === 0 &&
          item.color === descriptionTokenColors.normal
        ) {
          item.color = 0xc5b4f5
        }
        return item
      })
    ]

    const textMesh = new UITextMesh(
      segments,
      {
        ...textOptions.infoFlyoutBody,
        width: width - TEXT_X_OFFSET - ICON_SIZE - MARGIN
      },
      undefined,
      undefined,
      undefined,
      updateLayout
    )
    bg.add(textMesh)

    textMesh.matrix.setConstraints(
      undefined,
      ReadonlyPin.Left,
      ReadonlyPin.Left.cloneOffset(TEXT_X_OFFSET + MARGIN, 0)
    )

    if (needsLabel) {
      const labelPin = ReadonlyPin.TopRight.cloneOffset(
        LABEL_X_OFFSET,
        LABEL_Y_OFFSET
      )
      const label = new UITextMesh(
        isTrait ? i18n.t('cardMeta:trait') : i18n.t('cardMeta:effect'),
        textOptions.infoFlyoutSubtitle,
        undefined,
        undefined,
        undefined,
        tm => {
          if (titleBar) {
            titleBar.matrix.size.x.offset = tm.width
          }
        }
      )
      label.matrix.setConstraintsPosition(labelPin)

      delete label.userData.isFrontFacing
      bg.add(label)

      if (info.vocab.type === 'trait') {
        const trait = info.vocab.pattern
          .replace(/[{}]/g, '')
          .toLowerCase() as Trait
        const rowIndex = TRAIT_TO_PALETTEROW[trait]
        bg.material.paletteRow = rowIndex
        if (titleBar) {
          titleBar.material.paletteRow = rowIndex
        }
      }
    }

    const assetName = info.vocab.icon
      ? (`${info.vocab.icon}-icon` as const)
      : undefined

    if (
      assetName &&
      // TODO: investigate if we actually want these excluded.
      assetName !== 'trigger-play-icon' &&
      assetName !== 'trigger-summon-icon'
    ) {
      getTexturedMesh2D(assetName).then(icon => {
        icon.matrix.setConstraints(Pin.fromPixels(ICON_SIZE, ICON_SIZE))
        this.add(icon)
        this._icon = icon
        updateLayout()
      })
    }
    this._inited = true
    updateLayout()
  }

  get height() {
    return this._height
  }
}
