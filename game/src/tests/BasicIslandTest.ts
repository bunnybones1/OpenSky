import { i18nInit } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { BufferGeometry, Mesh, MeshBasicMaterial } from 'three'

import { getAssetsManager } from '~/assets'
import env from '~/env'
import { startMainGameLoop } from '~/mainGameLoop'
import queryParamColors from '~/queryParamColors'
import queryParams from '~/queryParams'
import { bgColor } from '~/renderer'
import { scene } from '~/scenes/arena/scene'
import { UI } from '~/scenes/ui'
import { debugGuiState } from '~/userSettings'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { findObject3DByName } from '~/utils/threeUtils'

import { animateIntro, initScene, updateScene } from '../scenes/arena'

export default class BasicIslandTest {
  constructor(private _showDebug = true) {
    debugGuiState.value = false
    const ui = new UI()
    globalAccess.ui = ui
    if (!queryParamColors.bgColor) {
      bgColor.value.setStyle('#76a1ce')
    }
    // normally RenderLayerState.Default would be fine for tests,
    // but the island has a reflection proxy of clouds on that layer
    // RenderLayerState.Default = true

    startMainGameLoop(ui, cameraShaker.shakyCamera, scene, dt =>
      updateScene(dt)
    )
  }

  async init() {
    const ui = globalAccess.ui!
    await getAssetsManager().loadAsset('uiSmall')
    await ui.getContainer('debug').ready
    await i18nInit({
      defaultNS: 'game',
      lng: 'en',
      version: env.GITCOMMIT
    })

    scene.add(ui.allContainersInOne)
    if (this._showDebug) {
      ui.getContainer('debug').fadeIn()
    }

    await initScene().promisedIsland
    const rope = findObject3DByName(scene, 'field-rope', true) as Mesh<
      BufferGeometry,
      MeshBasicMaterial
    >
    rope.visible = false
    const ropeShadow = findObject3DByName(
      scene,
      'field-rope-shadow',
      true
    ) as Mesh<BufferGeometry, MeshBasicMaterial>
    ropeShadow.visible = false
    const skipIntro = queryParams.skipIntro
    await animateIntro(skipIntro ? 0 : 500)

    // run resize handler to make sure everything initialized correctly
    device.handleChange()
  }
}
