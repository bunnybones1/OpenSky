import {
  CardDescriptionToken,
  getTextSegmentsFromDescription
} from '@opensky/parse-card-description'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import Object2D from './Object2D'

const MARGIN = 10
const NBSP = ' '

export default class LoreBox extends Object2D {
  private textMesh: UITextMesh
  private _inited = false
  constructor(
    public info: CardDescriptionToken[],
    width: number,
    isArtist: boolean,
    public onLayoutChanged?: () => void
  ) {
    super()

    const bg = getAssetsManager().fetchMeshDeepClone('uiSmall', 'info-box')
    this.add(bg)
    const textcontainer = new Object2D()
    textcontainer.matrix.setConstraints(
      new Pin(0.85, 0.85, 0, 0),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    bg.add(textcontainer)

    const updateLayout = () => {
      if (!this._inited) {
        return
      }
      const h = textMesh.height + MARGIN * 2.3
      bg.matrix.setConstraints(
        Pin.fromPixels(width + MARGIN, h),
        ReadonlyPin.TopLeft,
        Pin.fromPixels(0, 0)
      )

      textMesh.matrix.setConstraints(
        new Pin(1, 1),
        ReadonlyPin.Center,
        ReadonlyPin.Bottom.cloneOffset(0, 0)
      )

      if (this.onLayoutChanged) {
        this.onLayoutChanged()
      }
    }

    const parsedText = getTextSegmentsFromDescription(
      info.map(seg =>
        !isArtist && seg.type === 'explainer'
          ? {
              ...seg,
              value: {
                text: `\n\n-${NBSP}${seg.value.text}`
              }
            }
          : seg
      )
    ).map(segment => ({
      ...segment,
      color: textOptions.loreFlyoutBody.color,
      italicSkew: isArtist ? 0 : 0.2,
      fontWeight: isArtist ? 1 : 1.3
    }))

    const textMesh = new UITextMesh(
      parsedText,
      {
        ...textOptions.loreFlyoutBody,
        size: 17,
        width: width * 0.85,
        vAlign: 'center'
      },
      undefined,
      undefined,
      undefined,
      updateLayout
    )
    textcontainer.add(textMesh)
    this.textMesh = textMesh

    this._inited = true
    updateLayout()
  }

  get height() {
    return this.textMesh.height + MARGIN * 2.3
  }
}
