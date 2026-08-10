import { renderMetrics } from '@opensky/shared/renderMetrics'
import { lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Color, Mesh, RawShaderMaterial } from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_BLACK } from '~/colors/colorLibrary'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { modifyMeshForCentroidAnimations } from '~/utils/experimentalGltfCleanup'

import { playSound } from './soundHelpers'

function __playSound(duration: number) {
  playSound(
    'audioFxMatchEnd',
    duration > 1100 ? 'CarvedWallAssemble' : 'CarvedWallAssemble2'
  )
}

interface IPerspectiveCamera {
  fov: number
  aspect: number
}
export default class CarvedWall {
  private _animValue = { value: 0 }
  mesh: Promise<Mesh>
  constructor(private _camera: IPerspectiveCamera) {
    const initMesh = async () => {
      await getAssetsManager().loadAsset('carvedWall')
      const mesh = getAssetsManager().fetchMeshDeepClone(
        'carvedWall',
        'carved-wall',
        undefined,
        true
      ) as Mesh

      listenToProperty(renderMetrics, 'aspect', () => {
        const aspectAspect = Math.max(1, this._camera.aspect / (16 / 9))
        mesh.scale.setScalar((aspectAspect / 55) * this._camera.fov)
      })
      modifyMeshForCentroidAnimations(mesh)
      mesh.position.z = 0.23
      mesh.position.y = 0.13
      mesh.rotation.x = Math.PI * 0.35

      const uTime: { value: number } = { value: -1.7 }
      const mat = mesh.material as RawShaderMaterial
      mat.uniforms.uCentroidTime = uTime
      const uDiffusionColorVal = mat.uniforms.uDiffusionColor.value as Color
      const uDiffusionColorValOriginal = uDiffusionColorVal.clone()
      const uReflectionColorVal = mat.uniforms.uReflectionColor.value as Color
      const uReflectionColorValOriginal = uReflectionColorVal.clone()

      listenToProperty(this._animValue, 'value', v => {
        uTime.value = lerp(-1.7, 1.2, v)
        const mix = lerp(-1, 0.5, Easing.Cubic.Out(v))
        uDiffusionColorVal
          .copy(uDiffusionColorValOriginal)
          .lerp(COLOR_BLACK, mix)
        uReflectionColorVal
          .copy(uReflectionColorValOriginal)
          .lerp(COLOR_BLACK, mix)
      })

      await getAssetsManager().loadAsset('audioFxMatchEnd')
      return mesh
    }
    this.mesh = initMesh()
  }

  animateIn(duration = 1500, delay = 0) {
    duration *= 1 - this._animValue.value
    __playSound(duration)
    return simpleTweener.to({
      description: 'show carved wall',
      target: this._animValue,
      propertyGoals: { value: 1 },
      duration,
      delay
    })
  }
  animateOut(duration = 1500) {
    duration *= this._animValue.value
    return simpleTweener.to({
      description: 'hide carved wall',
      target: this._animValue,
      propertyGoals: { value: 0 },
      duration
    })
  }
}
