import { CircleGeometry, Color, Mesh, MeshBasicMaterial } from 'three'

import { getAssetsManager } from '~/assets'
import SoundLayerManager from '~/audio/SoundLayer'
import {
  getExtraMagicSoundLayer,
  getMagicGlowBaseSoundLayer
} from '~/audio/soundLayersLibrary'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestMagicSoundsScene extends BaseTestScene {
  async initUI(ui: UI) {
    await Promise.all([
      getAssetsManager().loadAsset('particle'),
      getAssetsManager().loadAsset('noise3Map'),
      getAssetsManager().loadAsset('uiSmall'),
      getAssetsManager().loadAsset('audioFxCommon')
    ])

    const container = ui.getContainer('randomTests')
    await container.ready

    const scene = this.scene

    function addCircle(color: Color, y = 0) {
      const mesh = new Mesh(
        new CircleGeometry(0.15, 64),
        new MeshBasicMaterial({ color, opacity: 0.2, transparent: true })
      )
      scene.add(mesh)
      mesh.position.y = y
      mesh.rotation.x = Math.PI * -0.5
      return mesh
    }

    function rigCircleToSound(
      color: Color,
      soundManager: SoundLayerManager,
      y = 0
    ) {
      const circleMesh = addCircle(color, y)

      let wantsToPlay = false
      let isPlaying = false
      function updateOpacity() {
        circleMesh.material.opacity =
          (wantsToPlay ? 1 : 0.2) * (isPlaying ? 1 : 0.75)
      }

      soundManager.listenForPlaying(v => {
        isPlaying = v
        updateOpacity()
      })

      soundManager.listenForWantsToPlay(v => {
        wantsToPlay = v
        updateOpacity()
      })
    }
    rigCircleToSound(new Color(0.1, 0.2, 0.8), getMagicGlowBaseSoundLayer())
    rigCircleToSound(new Color(0.1, 0.8, 0.2), getExtraMagicSoundLayer(), 0.02)

    const baseControllers: Array<(amt: number) => void> = []
    const extraControllers: Array<(amt: number) => void> = []
    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('+1 base', () => {
          const c = getMagicGlowBaseSoundLayer().getController()
          c(1)
          baseControllers.push(c)
        }),
        new QuickButtonData('-1 base', () => {
          if (baseControllers.length > 0) {
            const c = baseControllers.pop()!
            c(0)
          }
        }),
        new QuickButtonData('+1 extra', () => {
          const c = getExtraMagicSoundLayer().getController()
          c(1)
          extraControllers.push(c)
        }),
        new QuickButtonData('-1 extra', () => {
          if (extraControllers.length > 0) {
            const c = extraControllers.pop()!
            c(0)
          }
        })
      ],
      ReadonlyPin.Right,
      ReadonlyPin.Right.cloneOffset(-20, 0)
    )

    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}

export const scene = TestMagicSoundsScene
