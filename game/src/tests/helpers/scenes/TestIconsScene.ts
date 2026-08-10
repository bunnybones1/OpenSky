import { Mesh, PerspectiveCamera } from 'three'

import { getAssetsManager } from '~/assets'
import { findObject3DByName } from '~/utils/threeUtils'

import { BaseTestScene } from './BaseTestScene'

class TestIconsScene extends BaseTestScene {
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
      const scene = this.scene
      function addIcon(name: string, x: number) {
        const icon = findObject3DByName<Mesh>(
          getAssetsManager().getAsset('gamePiecesGraphical'),
          name
        )
        scene.add(icon)
        icon.position.set(x, 0, 0)
        const s = 10000
        icon.scale.set(s, s, s)
      }
      addIcon('ui-icon-dust', 0)
      addIcon('ui-icon-buff-arrow', -1000)
      //   const textHackThatFixesGLState = new TextMesh('0', textOptions.debugText)
      //   this.scene.add(textHackThatFixesGLState)
    }
    init()
  }
}
export const scene = TestIconsScene
