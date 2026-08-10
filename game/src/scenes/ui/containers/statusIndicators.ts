import { lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Color } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import { simpleTweener } from '~/systems/animation/tweeners'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

const __colorBad = new Color(1, 0.5, 0)
const __colorGood = new Color(0, 1, 0.2)
export default class StatusIndicatorsContainer extends UIContainer {
  masterScale = 0
  statusValue = 0
  private _timeSinceAssetReattemptActivity = 10
  private circle: Mesh2D
  private color: Color
  constructor(ui: UI, priority: number) {
    super(ui, 'statusIndicators', {
      priority
    })
  }
  update(dt: number) {
    this._timeSinceAssetReattemptActivity += dt
    this.masterScale -=
      (this.masterScale -
        (this._timeSinceAssetReattemptActivity < 10 ? 1 : -0.1)) *
      0.15
    if (!this.circle) {
      return
    }
    this.circle.visible = this.masterScale > 0
    if (!this.circle.visible) {
      return
    }

    const statusScale = lerp(
      1,
      this.statusValue >= 0 ? 1.5 : 0.85,
      Math.abs(this.statusValue)
    )
    const s = this.masterScale * statusScale
    this.circle.matrix.prescale.set(s, s)
    this.color
      .setRGB(1, 0, 0)
      .lerp(
        this.statusValue >= 0 ? __colorBad : __colorGood,
        Math.abs(this.statusValue)
      )
    this.circle.matrix.setColor(this.color)
  }
  protected async init() {
    await getAssetsManager().loadAsset('uiSmall')
    const color = new Color(1, 0, 0)

    const circle = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'circle-filled'
    )
    circle.matrix.setColor(color)
    circle.matrix.setConstraints(
      new Pin(0, 0, 10, 10),
      undefined,
      new Pin(1, 0, -10, 10)
    )
    this.add(circle)
    let totalKnown = 0
    this.circle = circle
    this.color = color

    listenToProperty(getAssetsManager(), 'assetsInReattemptMode', total => {
      this._timeSinceAssetReattemptActivity = 0
      this.statusValue = total > totalKnown ? 1 : -1
      simpleTweener.to({
        description: 'hide asset reattempt indicator',
        target: this as StatusIndicatorsContainer,
        propertyGoals: { statusValue: 0 },
        duration: 500
      })
      totalKnown = total
    })
    this._timeSinceAssetReattemptActivity = 10
  }
}
