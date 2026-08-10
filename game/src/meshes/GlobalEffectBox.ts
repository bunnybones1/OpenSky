import { i18n, translate } from '@opensky/language-manager'
import {
  CardDescriptionToken,
  descriptionTokenColors,
  getTextSegmentsFromDescription
} from '@opensky/parse-card-description'
import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { TextureType } from '~/assets/TextureType'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import { makeTriggerHolder2D } from '~/helpers/triggerHelpers'
import { GRAPHICAL_PIXEL_SIZE } from '~/scenes/ui/components/ActionHistorySidebar/constants'
import { getThumbnail } from '~/scenes/ui/components/ActionHistorySidebar/rowUtils'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import Mesh2D from './Mesh2D'
import Object2D from './Object2D'

const ICON_SIZE = 55
const TRIGGER_OFFSET = 20
const LABEL_X_OFFSET = -3
const LABEL_Y_OFFSET = 3
const TEXT_X_OFFSET = 12
const MARGIN = 10

export default class GlobalEffectBox extends Object2D {
  private _height: number
  private _icon: Mesh2D | undefined
  private _inited = false
  constructor(
    public title: CardDescriptionToken[],
    public description: CardDescriptionToken[],
    cardInstance: RelaxedCardInstance,
    width: number,
    public onLayoutChanged?: () => void
  ) {
    super()
    this.matrix.size = Pin.fromPixels(width, 40)

    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box',
      true,
      true
    )
    makeSuperOpaque(bg)

    const titleBar = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box-title',
      true,
      true
    )

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
      const extraSpace = 20
      const h = Math.max(
        ICON_SIZE + TRIGGER_OFFSET + extraSpace,
        textMesh.height + cardNameLabel.height + 7 + MARGIN * 2
      )
      this._height = h
      this.matrix.size.y.offset = h
      textMesh.matrix.offset.y.offset += cardNameLabel.height + 2
      if (this._icon) {
        this._icon.matrix.setConstraints(
          undefined,
          ReadonlyPin.BottomRight,
          ReadonlyPin.BottomRight.cloneOffset(
            -MARGIN,
            (-(h - extraSpace) + ICON_SIZE - MARGIN / 2 - TRIGGER_OFFSET / 2) /
              2
          )
        )
      }

      if (this.onLayoutChanged) {
        this.onLayoutChanged()
      }
    }

    const parsedTitle = getTextSegmentsFromDescription(title)
    const parsedBody = getTextSegmentsFromDescription(description)

    const segments = [
      ...(parsedTitle.length
        ? [
            ...parsedTitle.map(item => {
              if (item.fontWeight) {
                item.fontWeight *= 1.5
              }
              if (item.color === descriptionTokenColors.normal) {
                item.color = 0xffffff
              }
              return item
            }),
            { text: ', ', color: 0xffffff, fontWeight: 1.3 }
          ]
        : []),
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
        width: width - TEXT_X_OFFSET - ICON_SIZE - MARGIN * 2
      },
      undefined,
      undefined,
      undefined,
      updateLayout
    )
    bg.add(textMesh)

    textMesh.matrix.setConstraints(
      undefined,
      ReadonlyPin.BottomLeft,
      ReadonlyPin.TopLeft.cloneOffset(TEXT_X_OFFSET, textMesh.height / 2)
    )

    const labelPin = ReadonlyPin.TopRight.cloneOffset(
      LABEL_X_OFFSET,
      LABEL_Y_OFFSET
    )
    const label = new UITextMesh(
      i18n.t('cardMeta:gameEffect'),
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

    const rowPrototype = getAssetsManager()
      .getAsset('gamePiecesGraphical')
      .children.filter(m => m.name.includes('row-mini'))[0] as Mesh2D

    const thumbUrl = getThumbnail(cardInstance)
    const cardIconMesh = setupRowArt(
      rowPrototype,
      cardInstance.state.view.element,
      thumbUrl,
      undefined,
      false,
      TextureType.SmallUI
    )
    cardIconMesh.matrix.setConstraints(
      Pin.fromPixels(32 * 1.764, 32 * 1.764),
      ReadonlyPin.BottomRight.cloneOffset(5, 5),
      ReadonlyPin.BottomRight,
      GRAPHICAL_PIXEL_SIZE
    )
    this.add(cardIconMesh)
    this._icon = cardIconMesh

    const trigger = makeTriggerHolder2D('Continuous')

    if (trigger) {
      trigger.matrix.setConstraintsPosition(
        ReadonlyPin.Bottom.cloneOffset(0, 0)
      )
      trigger.matrix.prescale = new Vector2(0.7, 0.7)
      cardIconMesh.add(trigger)
    }

    const name = cardInstance ? translate.card.name(cardInstance.base) : ''

    const cardNameLabel = new UITextMesh(
      `Added by ${name}`,
      {
        ...textOptions.infoFlyoutBody,
        size: 12,
        color: '#AC8FFF',
        width: width - TEXT_X_OFFSET - ICON_SIZE - MARGIN
      },
      undefined,
      undefined,
      undefined,
      updateLayout
    )
    cardNameLabel.matrix.setConstraints(
      undefined,
      ReadonlyPin.Left.clone(),
      ReadonlyPin.BottomLeft.cloneOffset(TEXT_X_OFFSET, -cardNameLabel.height)
    )
    bg.add(cardNameLabel)
    this._inited = true
    updateLayout()
  }

  get height() {
    return this._height
  }
}
