import { Camera, Color, Fog, Scene, WebGLRenderer } from 'three'

import TransformComponent from '~/components/TransformComponent'
import { initVisualHooks } from '~/initVisualHooks'
import queryParamColors from '~/queryParamColors'
import queryParams from '~/queryParams'
import { UI } from '~/scenes/ui'
import { cameraShaker } from '~/utils/cameraShaker'

export class BaseTestScene {
  scene: Scene
  camera: Camera
  protected time: number = 0
  protected rayCamera: Camera
  protected bgColor: Color
  constructor() {
    initVisualHooks()
    const scene = new Scene()
    TransformComponent.defaultScene = scene

    cameraShaker.camera.layers.enableAll()

    const bgColor: Color = queryParamColors.bgColor || new Color(0x6f84bc)

    if (queryParams.bgFlash) {
      let flash = true
      setInterval(() => {
        flash = !flash
        const b = flash ? 1 : 0
        bgColor.setRGB(b, b, b)
      }, 500)
    }

    scene.fog = new Fog(bgColor.getHex(), 0, 6)
    scene.autoUpdate = false
    scene.matrixAutoUpdate = false

    const camera = cameraShaker.camera

    camera.position.set(0, 0.2, 0.4)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()

    scene.add(camera)

    this.scene = scene
    this.camera = cameraShaker.shakyCamera
    this.rayCamera = cameraShaker.camera
    this.bgColor = bgColor
  }

  initUI(ui: UI): Promise<void> {
    return Promise.resolve(void ui)
  }

  update(dt: number) {
    this.time += dt
    this.scene.updateMatrixWorld(false)
  }

  render(renderer: WebGLRenderer) {
    renderer.setClearColor(this.bgColor, 1)
    renderer.clear(true, true)
    renderer.render(this.scene, this.camera)
  }
}
