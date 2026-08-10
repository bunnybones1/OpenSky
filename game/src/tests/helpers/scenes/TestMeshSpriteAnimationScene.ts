import {
  MeshAnimationAssetName,
  MeshAnimationAssetNameStrings
} from '@opensky/shared/assets'
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

const useCustomList = false

const customList: MeshAnimationAssetName[] = [
  'meshAnimationEnergy020',
  'meshAnimationFire27',
  'meshAnimationEnergy021'
]
const EFFECT_NAMES = useCustomList ? customList : MeshAnimationAssetNameStrings

type SpriteAnimationMesh = Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>

class TestMeshSpriteAnimationScene extends BaseTestScene {
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
      for (const effectName of EFFECT_NAMES) {
        let counter = 0
        let finished = false
        const frameMeshes: SpriteAnimationMesh[] = []
        frameMeshLibrary.set(effectName, frameMeshes)
        await getAssetsManager().loadAsset(effectName)

        while (!finished) {
          const meshes = findObject3DsWhoseNamesInclude<Mesh>(
            getAssetsManager().getAsset(effectName),
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
      for (const effectName of EFFECT_NAMES) {
        const demoMeshes: SpriteAnimationMesh[] = []
        demoMeshLibrary.set(effectName, demoMeshes)
        const frameMeshes = frameMeshLibrary.get(effectName)!

        for (let index = 0; index < 128; index++) {
          const demoMesh = frameMeshes[0].clone() as SpriteAnimationMesh
          demoMesh.frustumCulled = false

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

          demoMesh.position.x = index - 3.5
          demoMesh.position.y =
            EFFECT_NAMES.indexOf(effectName) - (EFFECT_NAMES.length - 1) * 0.5

          demoMesh.material = new ZPaletteMappedMeshMaterial({
            ...basicZPaletteMaterialOptions,
            paletteMapRow: index,
            paletteMapRowAnimLength: index === 23 ? 8 : 0,
            paletteRangeMapper: paletteRangeMapperLibrary.get(effectName)
          })

          scene.add(demoMesh)

          if (index === 0) {
            const textLabel = new TextMesh(`mesh: ${effectName} `, {
              ...textOptions.generic,
              align: 'left'
            })
            demoMesh.add(textLabel)
            textLabel.scale.setScalar(10)
            textLabel.position.x -= 1.75
          }
        }
      }
      let time = 0
      const frameProxy = {
        frame: 0
      }

      const crackRangeMapper = paletteRangeMapperLibrary.get(
        'meshAnimationCrackTest'
      )!

      listenToProperty(frameProxy, 'frame', frame => {
        for (const effectName of EFFECT_NAMES) {
          const demoMeshes = demoMeshLibrary.get(effectName)!
          const frameMeshes = frameMeshLibrary.get(effectName)!

          for (let i = 0; i < demoMeshes.length; i++) {
            const mesh = demoMeshes[i]
            const frameSource = frameMeshes[frame % frameMeshes.length]

            if (frameSource instanceof Mesh) {
              mesh.geometry = frameSource.geometry
              mesh.visible = true
            } else {
              mesh.visible = false
            }
          }
        }
      })

      UpdateManager.register({
        update(dt: number) {
          time += dt
          frameProxy.frame = ~~(time * fps)

          crackRangeMapper.x = Math.sin(time * 0.1 * Math.PI) * 0.3 - 0.3

          for (const effectName of EFFECT_NAMES) {
            const demoMeshes = demoMeshLibrary.get(effectName)!

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
export const scene = TestMeshSpriteAnimationScene
