import { ConquestMatchResult } from '@opensky/proto'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { extractColorVals } from '~/colors/utils'
import { deduceCurrentMatchNum } from '~/helpers/conquestDataHelper'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedObject } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import { onNextFrame } from '~/utils/onNextFrame'

export enum TickIndicator {
  NONE,
  CHECK_LILAC,
  CHECK_BLUE,
  X,
  CURRENT,
  CURRENT_BIG,
  EMPTY,
  FILLED,
  NEXT
}

//built at 14.5px in diameter
const __tickIndicatorMeshNames = {
  [TickIndicator.CHECK_BLUE]: 'progression-tick-pass-blue',
  [TickIndicator.CHECK_LILAC]: 'progression-tick-pass-lilac',
  [TickIndicator.X]: 'progression-tick-fail',
  [TickIndicator.CURRENT]: 'progression-tick-current',
  [TickIndicator.EMPTY]: '',
  [TickIndicator.FILLED]: 'circle-filled',
  // [TickIndicator.CURRENT]: '7',
  // [TickIndicator.CURRENT]: 'progression-tick-current-black-circle',
  [TickIndicator.CURRENT_BIG]: 'progression-tick-current-big',
  [TickIndicator.NEXT]: 'progression-tick-next'
}

const __ticksThatHideRing = [
  TickIndicator.CHECK_BLUE,
  TickIndicator.CHECK_LILAC,
  TickIndicator.X
]

export default class ProgressionTick extends Object2D {
  private _indicatorMesh: Mesh2D
  private _indicatorAnimation: AnimatedObject<any> | undefined
  private _ringOpacityAnimation: AnimatedObject<any> | undefined
  tickColor: Color
  thickness: number
  private _ring: Mesh2D
  get indicator(): TickIndicator {
    return this._indicator
  }
  set indicator(value: TickIndicator) {
    if (this._indicator !== value) {
      this._indicator = value
      onNextFrame(() => {
        this.updateIndicatorVisuals(true)
      })
    }
  }
  private _color: Color
  private _colorAnimation: AnimatedObject<Color> | undefined
  get progressed(): boolean {
    return this._progressed
  }
  set progressed(value: boolean) {
    if (this._progressed !== value) {
      if (this._colorAnimation) {
        this._colorAnimation.kill()
      }
      onNextFrame(() => {
        if (this._colorAnimation) {
          this._colorAnimation.kill()
        }
        this._colorAnimation = simpleTweener.to({
          description: 'anim progression tick color',
          target: this._color,
          propertyGoals: extractColorVals(
            value ? this._colorProgress : this._colorBase
          ),
          duration: 150,
          onComplete: () => {
            this._ring.matrix.setColor(this._color)
            this._colorAnimation = undefined
          }
        })
      })
    }
    this._progressed = value
  }

  updateIndicatorVisuals(animate: boolean) {
    if (this._indicatorAnimation) {
      this._indicatorAnimation.kill()
      this._indicatorAnimation = undefined
    }
    if (this._ringOpacityAnimation) {
      this._ringOpacityAnimation.kill()
      this._ringOpacityAnimation = undefined
    }
    if (this._indicatorMesh) {
      const mesh = this._indicatorMesh
      function cleanupOldIndicator() {
        if (mesh.parent) {
          mesh.parent!.remove(mesh)
        }
      }
      if (animate) {
        const animVal = { value: this._indicatorMesh.matrix.prescale.x }
        this._indicatorMesh.matrix.prescale.setScalar(0.0001)
        simpleTweener.to({
          description: 'scale indicator',
          target: animVal,
          propertyGoals: { value: 0 },
          duration: 200,
          onUpdate() {
            mesh.matrix.prescale.setScalar(animVal.value)
          },
          onComplete: cleanupOldIndicator
        })
      } else {
        cleanupOldIndicator()
      }
    }
    if (this._indicator !== TickIndicator.NONE) {
      if (__tickIndicatorMeshNames[this._indicator]) {
        const mesh = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          __tickIndicatorMeshNames[this._indicator],
          true,
          true
        ) as Mesh2D
        // if (this._indicator === TickIndicator.CURRENT) {
        //   __tickIndicatorExtras[this._indicator]().then(extra => {
        //     mesh.add(extra)
        //   })
        // }
        if (this._indicator === TickIndicator.FILLED) {
          // mesh.matrix.setColor(this._color)
        }
        const t = 0.15 * this._radius
        mesh.matrix.setConstraints(
          ReadonlyPin.FullSize,
          ReadonlyPin.Center,
          ReadonlyPin.Center,
          new Vector2(t, t)
        )

        this._indicatorMesh = mesh
        this.add(mesh)
        if (animate) {
          const animVal = { value: 0 }
          // this._indicatorMesh.scale.setScalar(0.0001)
          this._indicatorAnimation = simpleTweener.to({
            description: 'show progression tick indicator',
            target: animVal,
            propertyGoals: { value: 1 },
            duration: 250,
            easing: Easing.Linear,
            onUpdate: () => {
              // mat.opacity = Easing.Cubic.Out(animVal.value)
              // mesh.scale.setScalar(lerp(5, 1, Easing.Quartic.Out(animVal.value)))
            },
            onComplete: () => {
              this._indicatorAnimation = undefined
            }
          })
        }
      }
    }
    const ringVisible = !__ticksThatHideRing.includes(this._indicator)
    if (animate) {
      const targetOpacity = ringVisible ? 1 : 0
      this._ring.visible = true
      this._ringOpacityAnimation = simpleTweener.to({
        description: 'show/hide progression tick indicator ring',
        target: this._ring.matrix,
        propertyGoals: { opacity: targetOpacity },
        duration: 300,
        easing: Easing.Quartic.Out,
        onComplete: () => {
          this._ring.visible = targetOpacity !== 0
        }
      })
    } else {
      this._ring.visible = ringVisible
      this._ring.matrix.opacity = ringVisible ? 1 : 0
    }
  }
  constructor(
    private _progressed: boolean,
    private _indicator: TickIndicator,
    private _radius: number,
    thickness: number,
    private _colorBase: Color,
    private _colorProgress: Color
  ) {
    super()
    const ring = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'circle-outline-inner'
    )
    this._ring = ring
    ring.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.Center,
      ReadonlyPin.Center,
      new Vector2(thickness, thickness)
    )
    this._color = (_progressed ? _colorProgress : _colorBase).clone()
    // ringMat.color = color
    // this._color = color
    ring.matrix.setColor(this._color)
    this.add(ring)
    this.updateIndicatorVisuals(false)
  }
}

const __statusIconLookup: { [K in ConquestMatchResult]: TickIndicator } = {
  [ConquestMatchResult.UNKNOWN]: TickIndicator.NONE,
  [ConquestMatchResult.LOSS]: TickIndicator.X,
  [ConquestMatchResult.DRAW]: TickIndicator.NEXT,
  [ConquestMatchResult.WIN]: TickIndicator.CHECK_BLUE
}
export function getPrematchConquestProgressTicks(
  matchProgress: ConquestMatchResult[]
): TickIndicator[] {
  const ticks = [TickIndicator.NONE, TickIndicator.NONE, TickIndicator.NONE]

  let currentMatch: 0 | 1 | 2 = 0

  currentMatch = deduceCurrentMatchNum(matchProgress)
  for (let i = 0; i < matchProgress.length; i++) {
    const indicator = __statusIconLookup[matchProgress[i]]
    ticks[i] = indicator
  }
  ticks[currentMatch] = TickIndicator.NEXT
  return ticks
}
