import { i18n, translate } from '@opensky/language-manager'
import {
  CardDescriptionToken,
  getGlobalEffectDescription,
  getParsedCardDescription
} from '@opensky/parse-card-description'
import { BaseCard, Player } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { getCardCache } from '~/cardCache'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { Components } from '~/components/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { store } from '~/state/index'

import GlobalEffectBox from './GlobalEffectBox'
import Object2D from './Object2D'

const TOP_OFFSET = 0
const TOOLTIP_SPACING = 8

type GlobalEffect = {
  duration: number | 'this_game' | 'next_turn' | 'never'
  source: Entity<Components>
}

export function makeGlobalEffectBoxes(
  card: RelaxedCardInstance,
  width: number,
  putTipsOnLeft: boolean,
  owner: Player
) {
  const { players } = store.state!.state
  const globalModifiers = players[owner].globalCardModifiers
  const continuousEffectInstances: GlobalEffect[] = []
  const heroMods = card.state.temporaryModifiers
  for (const hm of heroMods) {
    if (
      hm.source !== 0 &&
      hm.source !== 1 &&
      (hm.expiry.type === 'OnTurn' || hm.expiry.type === 'Never') &&
      typeof hm.modifier === 'object'
    ) {
      // do not show Banner here
      if (
        'ModifyPower' in hm.modifier &&
        hm.modifier.ModifyPower[1] === 'Banner'
      ) {
        continue
      }

      const source = getCardCache().getEntity(hm.source)

      if (source) {
        continuousEffectInstances.push({
          duration:
            'ChangeMana' in hm.modifier
              ? 'next_turn'
              : hm.expiry.type === 'Never'
              ? 'never'
              : store.state?.state.turnCount
              ? hm.expiry.payload - store.state?.state.turnCount
              : hm.expiry.payload,
          source
        })
      }
    }
  }
  for (const gm of globalModifiers) {
    const source = getCardCache().getEntity(gm.source)

    if (source) {
      continuousEffectInstances.push({ duration: 'this_game', source })
    }
  }
  if (continuousEffectInstances.length > 0) {
    return new GlobalEffectBoxes(
      continuousEffectInstances,
      width,
      putTipsOnLeft
    )
  } else {
    return undefined
  }
}
export default class GlobalEffectBoxes extends Object2D {
  private static _infoBoxCache: Map<string, GlobalEffectBox> = new Map()

  private _infoBoxes: GlobalEffectBox[] = []

  constructor(
    continuousEffectInstances: GlobalEffect[],
    private _width: number,
    private _putTipsOnLeft: boolean
  ) {
    super()
    this.matrix.setConstraints(
      Pin.fromPixels(_width, 0),
      ReadonlyPin.TopRight,
      ReadonlyPin.Center
    )
    for (const ce of continuousEffectInstances) {
      const { duration, source } = ce
      if (source && source.has('cardInstance')) {
        const cardInstance = source.get('cardInstance')
        const rawDescription = getParsedCardDescription(
          translate.card.description(cardInstance.base),
          id => translate.card.name(`${id}` as BaseCard),
          i18n.t
        )
        if (
          !rawDescription ||
          !rawDescription.some(p => p.type === 'globalEffectDelimiter')
        ) {
          continue
        }
        const durationText =
          duration === 'this_game'
            ? i18n.t('ui.thisGame')
            : duration === 'next_turn'
            ? i18n.t('ui.nextTurn')
            : duration === 'never'
            ? undefined
            : i18n.t('ui.ForTurn', { count: duration })

        const description = getGlobalEffectDescription(
          rawDescription,
          durationText ? 'lowercase' : 'uppercase'
        )
        if (description.length == 0) {
          continue
        }
        description.push({ type: 'normal', value: { text: '.' } })
        const text = description
        const title = durationText
          ? [
              {
                type: 'bold',
                value: {
                  text: durationText as unknown as 'Dust',
                  boldable: 'dust'
                }
              } as const
            ]
          : []

        const infoBox = this.getInfoBox(
          title,
          text,
          cardInstance,
          continuousEffectInstances.indexOf(ce)
        )

        infoBox.matrix.setConstraints(
          undefined,
          ReadonlyPin.TopLeft,
          ReadonlyPin.TopLeft.clone() // cloned since we change it in updateLayout
        )

        this.add(infoBox)
        this._infoBoxes.push(infoBox)
      }
    }

    this._updateLayout()
  }

  get direction(): 'left' | 'right' {
    return this._putTipsOnLeft ? 'left' : 'right'
  }

  getInfoBox(
    title: CardDescriptionToken[],
    description: CardDescriptionToken[],
    cardInstance: RelaxedCardInstance,
    duplicate: number
  ) {
    const key = `${cardInstance.id}${description
      .map(t => t.value.text)
      .join('-')}${duplicate}`
    const onLayoutChanged = () => this._updateLayout()
    if (!GlobalEffectBoxes._infoBoxCache.has(key)) {
      GlobalEffectBoxes._infoBoxCache.set(
        key,
        new GlobalEffectBox(
          title,
          description,
          cardInstance,
          this._width,
          onLayoutChanged
        )
      )
    }

    const infoBox = GlobalEffectBoxes._infoBoxCache.get(key)!

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
