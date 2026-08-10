import { clamp01, lerp } from '@opensky/shared/utils/math'

import { time } from '~/animationTime'

class YadaYada {
  private _lastTime: number = 0
  private _expediency: number = 0
  constructor(
    private _dur = 1,
    private _shortDur = 0.2,
    private _jumpSize = 0.25,
    private _highThresh = 2,
    private _lowThresh = 0.04
  ) {
    //
  }
  getDuration() {
    const now = time.value
    const timeSinceLastAsk = now - this._lastTime
    this._lastTime = now
    if (timeSinceLastAsk > this._lowThresh) {
      this._expediency = clamp01(
        timeSinceLastAsk < this._highThresh
          ? this._expediency + this._jumpSize
          : this._expediency -
              this._jumpSize * (timeSinceLastAsk / this._highThresh)
      )
    }
    return lerp(this._dur, this._shortDur, this._expediency)
  }
}

export type YadaYadaDurationTags =
  | 'dust'
  | 'default'
  | 'summon'
  | 'trigger'
  | 'damage'
  | 'missile'
  | 'missileCharge'
  | 'heal'
  | 'healCharge'
  | 'conjure'
  | 'ownershipSwap'
  | 'fastAttach'
  | 'cardSelectionToHand'
  | 'cardSelectionToDeck'

const YadaYadaDurationRegistry: {
  [K in YadaYadaDurationTags]: YadaYada
} = {
  dust: new YadaYada(1, 0.3, 0.15),
  default: new YadaYada(1, 1),
  summon: new YadaYada(),
  trigger: new YadaYada(),
  damage: new YadaYada(1, 0.5),
  missile: new YadaYada(),
  missileCharge: new YadaYada(),
  heal: new YadaYada(),
  healCharge: new YadaYada(),
  conjure: new YadaYada(),
  ownershipSwap: new YadaYada(0.25, 0.05, 0.05),
  fastAttach: new YadaYada(),
  cardSelectionToHand: new YadaYada(1, 0.05, 0.05, 2, -1),
  cardSelectionToDeck: new YadaYada(1, 0.05, 0.05, 2, -1)
}

export function getYadaYadaDuration(tag?: YadaYadaDurationTags) {
  if (tag) {
    return YadaYadaDurationRegistry[tag].getDuration()
  } else {
    return 1
  }
}
