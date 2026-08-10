import { MeshAnimationAssetName } from '@opensky/shared/assets'
import { DEGREES_TO_RADIANS } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import {
  BufferGeometry,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector4,
  WebGLRenderer
} from 'three'

import { getAssetsManager } from '~/assets'
import {
  basicZPaletteMaterialOptions,
  effectLibrary,
  EffectSettings,
  paletteLibrary,
  paletteRangeMapperLibrary
} from '~/helpers/meshAnimationHelpers'
import ZPaletteMappedMeshMaterial from '~/materials/ZPaletteMappedMeshMaterial'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UpdateManager from '~/systems/UpdateManager'
import { padLeadingZeros } from '~/utils/stringUtils'
import { findObject3DsWhoseNamesInclude } from '~/utils/threeUtils'

import { BaseTestScene } from './BaseTestScene'

const __mat = new Matrix4()

type SpriteAnimationMesh = Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>

const EFFECTS: EffectSettings[] = [
  // effectLibrary.bite_MSA,
  // effectLibrary.lotus_petals_5_MSA,
  // effectLibrary.hearts_MSA,
  // effectLibrary.mind_trigger_MSA,
  // effectLibrary.iris_meditation_MSA
  effectLibrary.axel_spectral_coins_MSA
]

class TestCuratedMeshSpriteAnimationScene extends BaseTestScene {
  constructor() {
    super()

    const testCamera = this.rayCamera as PerspectiveCamera

    testCamera.fov = 60
    testCamera.near = 0.01
    testCamera.far = 10
    testCamera.updateProjectionMatrix()
    testCamera.position.set(0, 0, 3)
    testCamera.lookAt(0, 0, 0)

    const init = async () => {
      const frameMeshLibrary: Map<
        MeshAnimationAssetName,
        SpriteAnimationMesh[]
      > = new Map()
      const scene = this.scene
      for (const effect of EFFECTS) {
        let counter = 0
        let finished = false

        const frameMeshes: SpriteAnimationMesh[] = []
        frameMeshLibrary.set(effect.meshName, frameMeshes)
        await getAssetsManager().loadAsset(effect.meshName)

        while (!finished) {
          const meshes = findObject3DsWhoseNamesInclude<Mesh>(
            getAssetsManager().getAsset(effect.meshName),
            padLeadingZeros(counter, 3)
          )
          if (meshes.length === 0) {
            finished = true
          } else if (meshes.length === 1) {
            frameMeshes.push(meshes[0] as SpriteAnimationMesh)
          } else {
            throw new Error('wtf?')
          }
          counter++
        }
      }
      const test = {
        value: 0
      }
      listenToProperty(test, 'value', v => {
        console.log(v)
      })

      const fps = 12
      const demoMeshLibrary: Map<
        MeshAnimationAssetName,
        SpriteAnimationMesh[]
      > = new Map()
      for (const effect of EFFECTS) {
        const demoMeshes: SpriteAnimationMesh[] = []
        demoMeshLibrary.set(effect.meshName, demoMeshes)
        const frameMeshes = frameMeshLibrary.get(effect.meshName)!

        const demoMesh = frameMeshes[0].clone() as SpriteAnimationMesh

        demoMesh.onBeforeRender = (
          renderer: WebGLRenderer,
          scene: Scene,
          camera: PerspectiveCamera,
          geometry: BufferGeometry,
          material: ZPaletteMappedMeshMaterial
        ) => {
          material.viewScale =
            1 / Math.tan(DEGREES_TO_RADIANS * 0.5 * camera.fov)

          const clipPos = material.uniforms.clipSpacePosition.value as Vector4
          __mat
            .multiplyMatrices(camera.matrixWorldInverse, demoMesh.matrixWorld)
            .premultiply(camera.projectionMatrix) //.multiply(camera.projectionMatrix)
          clipPos.set(0, 0, 0, 1).applyMatrix4(__mat)
        }

        demoMeshes.push(demoMesh)

        demoMesh.position.x = 0
        demoMesh.position.y =
          (EFFECTS.indexOf(effect) - (EFFECTS.length - 1) * 0.5) * 2

        demoMesh.material = new ZPaletteMappedMeshMaterial({
          ...basicZPaletteMaterialOptions,
          paletteMapRow: paletteLibrary[effect.paletteName].row,
          paletteMapRowAnimLength: paletteLibrary[effect.paletteName].animRows,
          paletteRangeMapper: paletteRangeMapperLibrary.get(effect.meshName)
          // supportsOpacity: true
        })

        scene.add(demoMesh)

        demoMesh.material.opacity = 0.7

        const textLabel = new TextMesh(
          `mesh: ${effect.meshName} \n palette: ${effect.paletteName} \n description: ${effect.description}`,
          { ...textOptions.generic, align: 'left' }
        )
        demoMesh.add(textLabel)
        textLabel.scale.setScalar(10)
        textLabel.position.x -= 1.5
        textLabel.position.y -= 0.5
      }
      let time = 0
      const frameProxy = {
        frame: 0
      }

      listenToProperty(frameProxy, 'frame', frame => {
        for (const effect of EFFECTS) {
          const demoMeshes = demoMeshLibrary.get(effect.meshName)!
          const frameMeshes = frameMeshLibrary.get(effect.meshName)!

          for (let i = 0; i < demoMeshes.length; i++) {
            const mesh = demoMeshes[i]
            mesh.geometry =
              frameMeshes[(frame + 5 * i) % frameMeshes.length].geometry
          }
        }
      })

      UpdateManager.register({
        update(dt: number) {
          time += dt
          frameProxy.frame = ~~(time * fps)

          for (const effect of EFFECTS) {
            const demoMeshes = demoMeshLibrary.get(effect.meshName)!

            for (let i = 0; i < demoMeshes.length; i++) {
              const mesh = demoMeshes[i]
              mesh.material.update(time)
            }
          }
        }
      })
    }
    init()
  }
}
export const scene = TestCuratedMeshSpriteAnimationScene
