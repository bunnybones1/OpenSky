import { clamp } from '@opensky/shared/utils/math'
import { Object3D, PerspectiveCamera } from 'three'

import { getAssetsManager } from '~/assets'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { makeTraitBadgeHolder } from '~/helpers/traitHelpers'
import { traitBadgeOrder, traitBadgeSort } from '~/helpers/typeHelpers'
import { UI } from '~/scenes/ui'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestTraitIconsScene extends BaseTestScene {
  get traitsTotal() {
    return this._traitsTotal
  }
  set traitsTotal(val: number) {
    this._traitsTotal = clamp(val, 0, 6)
    this._regenerateTraitBadges()
  }
  private set rowsAvailable(val: number) {
    this._rowsAvailable = clamp(val, 1, 3)
    this._regenerateTraitBadges()
  }
  private _traitBadgeHolder: Object3D | undefined
  private _traitAssetsReady = false
  private _rowsAvailable = 3
  private _traitsTotal = 3

  constructor() {
    super()

    const camera = this.camera as PerspectiveCamera

    camera.fov = 60
    camera.near = 0.01
    camera.far = 2000
    camera.updateProjectionMatrix()

    camera.position.set(0, 0, 1200)
    camera.lookAt(0, 0, 0)

    const init = async () => {
      await getAssetsManager().loadAsset('gamePiecesGraphical')

      this._traitAssetsReady = true

      this._regenerateTraitBadges()

      const textHackThatFixesGLState = new TextMesh('0', textOptions.debugText)
      this.scene.add(textHackThatFixesGLState)
    }
    init()
  }
  async initUI(ui: UI) {
    const container = ui.getContainer('randomTests')
    await container.ready
    await getAssetsManager().loadAsset('uiSmall')
    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('+1 Trait', () => {
          this.traitsTotal++
        }),
        new QuickButtonData('-1 Trait', () => {
          this.traitsTotal--
        }),
        new QuickButtonData('1 Row', () => {
          this.rowsAvailable = 1
        }),
        new QuickButtonData('2 Rows', () => {
          this.rowsAvailable = 2
        }),
        new QuickButtonData('3 Rows', () => {
          this.rowsAvailable = 3
        }),
        new QuickButtonData('Regenerate', () => {
          this._regenerateTraitBadges()
        })
      ],
      ReadonlyPin.BottomRight
    )
    container.show()
    return super.initUI(ui)
  }
  update(dt: number): void {
    this._traitBadgeHolder?.rotateZ(dt)
  }
  private _regenerateTraitBadges() {
    if (!this._traitAssetsReady) {
      return
    }

    if (this._traitBadgeHolder) {
      this.scene.remove(this._traitBadgeHolder)
    }
    const trb = makeTraitBadgeHolder(
      traitBadgeOrder
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, this._traitsTotal)
        .sort(traitBadgeSort),
      this._rowsAvailable
    )
    if (trb) {
      trb.scale.multiplyScalar(10000)
      trb.rotation.x = Math.PI * 0.5
      this.scene.add(trb)
      this._traitBadgeHolder = trb
    }
  }
}
export const scene = TestTraitIconsScene
