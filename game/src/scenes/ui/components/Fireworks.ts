import { lerp, rand } from '@opensky/shared/utils/math'
import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import { makeHSL } from '~/colors/utils'
import { PALETTE_ROW } from '~/constants'
import { applyBlendMode } from '~/helpers/blendModeHelpers'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { playRandomSoundVariation } from '~/helpers/soundHelpers'
import FireCracker from '~/meshes/FireCracker'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { removeFromParent } from '~/utils/threeUtils'

interface Preset {
  total: number
  scale: number
  duration: number
}

const presets: Preset[] = [
  { total: 400, scale: 0.8, duration: 1500 },
  { total: 1200, scale: 2, duration: 2800 }
]
export default class Fireworks {
  mesh = new Object2D()
  private _collection: Set<FireCracker> = new Set()
  private _isPlaying: boolean = false
  private _initd: boolean = false
  private limit = 5
  constructor() {
    this.init()
  }

  update() {
    if (!this._initd) {
      return
    }

    if (this._isPlaying) {
      if (this._collection.size < this.limit && Math.random() < 0.05) {
        playRandomSoundVariation('audioFxMatchEndVariations', 'Firework')

        const color = makeHSL(Math.random(), 1, 0.75)
        const flareEnd = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'rectangle-soft-round',
          true
        )
        flareEnd.material.paletteRow = PALETTE_ROW.BLACK_AND_WHITE
        flareEnd.material.depth = 0.95
        applyBlendMode(flareEnd.material, 'screen')
        const flarePrescale = new Vector2(50, 50)
        flareEnd.matrix.setConstraints(
          ReadonlyPin.EmptySize,
          ReadonlyPin.Center,
          ReadonlyPin.Center,
          flarePrescale
        )
        const flareScale = { val: 0 }
        simpleTweener.to({
          description: 'flare scale',
          target: flareScale,
          propertyGoals: { val: 1 },
          duration: 500,
          onUpdate() {
            flarePrescale.setScalar(
              lerp(
                0.001,
                50,
                Easing.Custom.Pulse(Easing.Quartic.Out(flareScale.val))
              )
            )
          },
          onComplete() {
            removeFromParent(flareEnd)
          }
        })

        const preset = presets[Math.random() > 0.75 ? 1 : 0]!
        const fireCracker: FireCracker = new FireCracker(
          getAssetsManager().getAsset('particle'),
          fc => this.remove(fc),
          preset.total,
          8000,
          16000,
          preset.duration,
          0.2,
          color,
          'screen'
        )
        fireCracker.material.depth = 0.95
        fireCracker.matrix.setConstraints(
          new SizePin(0.5, 0.5, 1, 'fit'),
          ReadonlyPin.Center,
          new Pin(rand(0.25, 0.75), rand(0.25, 0.75)),
          new Vector2().setScalar(rand(0.8, 1.2))
        )
        flareEnd.matrix.setColor(color)
        this._collection.add(fireCracker)
        this.mesh.add(fireCracker)
        fireCracker.add(flareEnd)
      }
    }
  }

  start() {
    this._isPlaying = true
  }

  stop() {
    this._isPlaying = false
  }

  private async init() {
    await getAssetsManager().loadAsset('particle')
    this._initd = true
  }

  private remove(fc: FireCracker) {
    this._collection.delete(fc)
    this.mesh.remove(fc)
  }
}
