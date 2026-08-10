import { i18n, translate } from '@opensky/language-manager'
import {
  CardDescriptionToken,
  getParsedCardDescription
} from '@opensky/parse-card-description'
import { CARD_ARTISTS } from '@opensky/shared/artists'
import { CardLibrary } from '@skyweaver/state-metadata'

import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { getHeroSkin } from '~/helpers/heroSkins'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'

import LoreBox from './LoreBox'
import Object2D from './Object2D'

const TOP_OFFSET = 0
const TOOLTIP_SPACING = 8

export default class LoreBoxes extends Object2D {
  private static _loreBoxCache: Map<string, LoreBox> = new Map()

  private _loreBoxes: LoreBox[] = []

  constructor(
    card: RelaxedCardInstance,
    private _width: number
  ) {
    super()
    this.matrix.setConstraints(
      Pin.fromPixels(_width, 0),
      ReadonlyPin.TopRight,
      ReadonlyPin.Center
    )

    const info =
      card.base === 'Hero'
        ? (() => {
            const { artID, flavorText } = getHeroSkin(card)
            return {
              asset: artID,
              flavorText: getParsedCardDescription(
                flavorText,
                () => {
                  throw new Error("Don't use card names in flavor text!")
                },
                i18n.t
              )
            }
          })()
        : (() => {
            const cardLookup = CardLibrary.get(card.base)!
            return {
              asset: cardLookup.artSlug,
              flavorText: getParsedCardDescription(
                translate.card.flavorText(card.base),
                () => {
                  throw new Error("Don't use card names in flavor text!")
                },
                i18n.t
              )
            }
          })()

    const artists = CARD_ARTISTS.filter(a => info.asset.includes(a.id))
      .map(a => a.name)
      .join(' & ')

    const infos: Array<{
      isArtist: boolean
      tokens: CardDescriptionToken[]
    }> = [
      ...(info.flavorText.length
        ? [
            {
              isArtist: false,
              tokens: info.flavorText
            }
          ]
        : []),
      {
        isArtist: true,
        tokens: [
          {
            type: 'normal',
            value: {
              text: i18n.t('ui.artBy') + ` ${artists ?? i18n.t('ui.unknown')}`
            }
          }
        ]
      }
    ]
    for (const info of infos) {
      const infoBox = this.getLoreBox(info.tokens, info.isArtist)

      infoBox.matrix.setConstraints(
        Pin.fromPixels(_width, 10),
        ReadonlyPin.TopLeft.clone(),
        ReadonlyPin.TopLeft.clone() // cloned since we change it in updateLayout
      )
      this._loreBoxes.push(infoBox)
      this.add(infoBox)
    }
    this._updateLayout()
  }

  getLoreBox(info: CardDescriptionToken[], isArtist = false) {
    const key = info.map(i => JSON.stringify(i)).join('') + isArtist
    const onLayoutChanged = () => this._updateLayout()

    if (!LoreBoxes._loreBoxCache.has(key)) {
      LoreBoxes._loreBoxCache.set(
        key,
        new LoreBox(info, this._width, isArtist, onLayoutChanged)
      )
    }

    const infoBox = LoreBoxes._loreBoxCache.get(key)!

    // Reset layout handler
    infoBox.onLayoutChanged = onLayoutChanged

    return infoBox
  }

  private _updateLayout() {
    let lastY = TOP_OFFSET
    for (const infoBox of this._loreBoxes) {
      infoBox.matrix.offset.y.offset = lastY
      lastY += infoBox.height + TOOLTIP_SPACING
    }
    this.matrix.size.y.offset = lastY - TOOLTIP_SPACING
  }
}
