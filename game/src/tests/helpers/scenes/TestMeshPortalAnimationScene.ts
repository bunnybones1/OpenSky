import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { openPortal } from '~/helpers/meshEffectHelpers'
import {
  portalVariantParams,
  SupportedPortalVariants
} from '~/helpers/portalSettings'
import queryParams from '~/queryParams'
import Slider from '~/scenes/ui/components/Slider'
import { animationDelay } from '~/utils/asyncUtils'
import { globalAccess } from '~/utils/globalAccess'
import { createButton, createButtonText } from '~/utils/ui'

import { BaseTestScene } from './BaseTestScene'

class TestMeshEffectsScene extends BaseTestScene {
  constructor() {
    super()
    const init = async () => {
      await getAssetsManager().loadAsset('gamePiecesPhysical')
      await animationDelay(500)

      const scene = this.scene
      function quickPivot(x: number) {
        const o = new Object3D()
        scene.add(o)
        o.position.set(x, 0, 0)
        o.rotation.set(Math.PI * 0.35, 0, 0)
        o.scale.multiplyScalar(1.5)
        return o
      }

      const portalVariants: SupportedPortalVariants[] = [
        'conjure',
        'golden',
        // 'grayscale',
        // 'debug_red',
        'agy',
        'hrt',
        'str',
        'int',
        'wis'
      ]
      const portals = []

      const moveLeftButton = createButton(
        globalAccess.ui!.getContainer('debug'),
        () => {
          this.camera.position.x -= 0.25
        }
      )
      moveLeftButton.mesh.matrix.setConstraints(
        new Pin(0.05, 0.05, 0, 0),
        ReadonlyPin.Left,
        ReadonlyPin.Left
      )
      createButtonText(moveLeftButton.mesh, 'Move Camera Left')

      const moveRightButton = createButton(
        globalAccess.ui!.getContainer('debug'),
        () => {
          this.camera.position.x += 0.25
        }
      )
      moveRightButton.mesh.matrix.setConstraints(
        new Pin(0.05, 0.05, 0, 0),
        ReadonlyPin.Right,
        ReadonlyPin.Right
      )
      createButtonText(moveRightButton.mesh, 'Move Camera Right')

      let counter = 0
      const SPACING = 0.25

      for (const variant of portalVariants) {
        const portal = quickPivot(
          counter * SPACING - 0.75
          // * SPACING - portalVariants.length * 0.5 * SPACING
        )
        portals.push(portal)

        const vec4Keys = ['w', 'z', 'y', 'x'] as const
        const channelKeys = ['red', 'green', 'blue', 'op']

        channelKeys.reverse()

        const propTypeOffsets = {
          colorScale: 2000,
          colorOffset: 2050,
          colorBottomScale: 10,
          colorBottomOffset: 60
        }

        for (let i = 0; i < vec4Keys.length; i++) {
          for (const propType of [
            'colorScale',
            'colorOffset',
            'colorBottomScale',
            'colorBottomOffset'
          ] as const) {
            const label = `${i === 3 ? variant : ''} ${
              channelKeys[i]
            } ${propType}`
            const name = `${variant} ${channelKeys[i]} ${propType}`

            const nfpGain = new NiceFloatParameter(
              name,
              label,
              portalVariantParams[variant][propType][vec4Keys[i]],
              -2,
              2,
              v => v,
              v => v.toString(),
              'never',
              queryParams.resetSettings
            )

            nfpGain.listen(v => {
              portalVariantParams[variant][propType][vec4Keys[i]] = v
            })

            const slider = new Slider(nfpGain)
            slider.mesh.matrix.setConstraints(
              new Pin(0, 0, 400, 10),
              ReadonlyPin.BottomRight.cloneOffset(
                750 * i + 100,
                150 * counter + 30 + propTypeOffsets[propType]
              ),
              ReadonlyPin.BottomRight
            )
            globalAccess.ui!.getContainer('debug').add(slider.mesh)
          }
        }
        counter++
      }

      const saveButton = createButton(
        globalAccess.ui!.getContainer('debug'),
        () => {
          let saveString = ''
          for (const variant of portalVariants) {
            saveString += `${variant}: {\n`
            for (const propType of [
              'colorScale',
              'colorOffset',
              'colorBottomScale',
              'colorBottomOffset'
            ] as const) {
              saveString += `${propType}: new Vector4(${
                portalVariantParams[variant][propType].x
              },${portalVariantParams[variant][propType].y},${
                portalVariantParams[variant][propType].z
              },${portalVariantParams[variant][propType].w})${
                propType === 'colorBottomOffset' ? '' : ','
              }\n`
            }
            saveString += '},\n'
          }
          console.log(`saveString:\n${saveString}`)
        }
      )
      saveButton.mesh.matrix.setConstraints(
        new Pin(0.05, 0.05, 0, 0),
        ReadonlyPin.Top,
        ReadonlyPin.Top
      )
      createButtonText(saveButton.mesh, 'Console Log')

      for (let i = 0; i < 100000; i++) {
        await animationDelay(1000)
        let counter = 0
        for (const portal of portals) {
          openPortal(portal, undefined, portalVariants[counter])
          counter++
        }
        // await animationDelay(1000)
      }
    }
    init()
  }
}
export const scene = TestMeshEffectsScene
