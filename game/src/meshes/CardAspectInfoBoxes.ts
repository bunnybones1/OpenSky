import { translate } from '@opensky/language-manager'
import {
  getTooltipsForCards,
  VocabCard,
  VocabOnCard,
  VocabReason
} from '@skyweaver/state-metadata'

import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'

import CardAspectInfoBox from './CardAspectInfoBox'
import Object2D from './Object2D'

const TOP_OFFSET = 0
const TOOLTIP_SPACING = 8
const MAX_TOOLTIPS = 5

export function makeCardAspectInfoBoxes(
  cards: VocabCard[],
  width: number,
  putTipsOnLeft: boolean
) {
  const infos = getTooltipsForCards(cards.filter(c => c.base !== 'Hero')).slice(
    0,
    MAX_TOOLTIPS
  )
  if (infos.length > 0) {
    return new CardAspectInfoBoxes(infos, width, putTipsOnLeft)
  } else {
    return undefined
  }
}

export default class CardAspectInfoBoxes extends Object2D {
  private static _infoBoxCache: Map<string, CardAspectInfoBox> = new Map()

  private _infoBoxes: CardAspectInfoBox[] = []

  constructor(
    infos: VocabOnCard[],
    private _width: number,
    private _putTipsOnLeft: boolean
  ) {
    super()
    this.matrix.setConstraints(
      Pin.fromPixels(_width, 0),
      ReadonlyPin.TopRight,
      ReadonlyPin.Center
    )

    let lastY = TOP_OFFSET
    let dividerOffset = 0
    for (const info of infos) {
      const infoBox = this.getInfoBox(info)

      // Set a divider before the first reference
      if (
        !dividerOffset &&
        lastY !== TOP_OFFSET &&
        info.reason === VocabReason.Referenced
      ) {
        dividerOffset = 10
      }
      infoBox.matrix.setConstraints(
        undefined,
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.clone() // cloned since we change it in updateLayout
      )

      this.add(infoBox)
      this._infoBoxes.push(infoBox)
      lastY += infoBox.height + TOOLTIP_SPACING + dividerOffset
    }
    this._updateLayout()
  }

  get direction(): 'left' | 'right' {
    return this._putTipsOnLeft ? 'left' : 'right'
  }

  getInfoBox(info: VocabOnCard) {
    const title = translate.vocab.title(info.vocabID as 'draw')
    const text = translate.vocab.text(info.vocabID as 'draw')
    const key = title + text + info.reason
    const onLayoutChanged = () => this._updateLayout()

    if (!CardAspectInfoBoxes._infoBoxCache.has(key)) {
      CardAspectInfoBoxes._infoBoxCache.set(
        key,
        new CardAspectInfoBox(info, this._width, onLayoutChanged)
      )
    }

    const infoBox = CardAspectInfoBoxes._infoBoxCache.get(key)!

    // Reset layout handler
    infoBox.onLayoutChanged = onLayoutChanged

    return infoBox
  }

  private _updateLayout() {
    let lastY = TOP_OFFSET
    for (const infoBox of this._infoBoxes) {
      infoBox.matrix.offset.y.offset = lastY
      lastY += infoBox.height + TOOLTIP_SPACING
    }
    this.matrix.size.y.offset = lastY - TOOLTIP_SPACING
  }
}
