import { getAssetsManager } from '~/assets'
import { debuggables } from '~/debug/debugRegistry'
import {
  cameraChanger,
  sceneChanger,
  startMainGameLoop,
  updateChanger
} from '~/mainGameLoop'
import queryParamColors from '~/queryParamColors'
import { bgColor } from '~/renderer'
import { UI } from '~/scenes/ui'
import { globalAccess } from '~/utils/globalAccess'

import { BaseTestScene } from './helpers/scenes/BaseTestScene'

export class BasicTestBed {
  protected ui: UI
  constructor(
    private testScene: BaseTestScene,
    private _showDebugMenu = true
  ) {
    // Start loop
    const ui = new UI()
    if (!queryParamColors.bgColor) {
      bgColor.value.setStyle('#76a1ce')
    }
    testScene.scene.add(ui.allContainersInOne)
    startMainGameLoop(ui, testScene.camera, testScene.scene, dt =>
      testScene.update(dt)
    )
    globalAccess.ui = ui
    testScene.initUI(ui)
    sceneChanger.change(testScene.scene)
    cameraChanger.change(testScene.camera)
    updateChanger.change(testScene.update.bind(testScene))
    this.ui = ui
    this.init()
  }

  async init() {
    if (this._showDebugMenu) {
      await getAssetsManager().loadAsset('uiSmall')
      await this.ui.getContainer('debug').ready
      debuggables.setActiveLevel(1)
      this.ui.getContainer('debug').fadeIn()
    }
  }
  deinit() {
    // debugger
  }
}
