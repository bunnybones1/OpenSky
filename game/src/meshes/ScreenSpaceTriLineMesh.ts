import {
  Camera,
  Matrix4,
  Mesh,
  Scene,
  Vector2,
  Vector4,
  WebGLRenderer
} from 'three'

import { hues } from '~/colors/colorHues'
import { makeHSL } from '~/colors/utils'
import ScreenSpaceTriLineMaterial, {
  ScreenSpaceTriLineMaterialOptions
} from '~/materials/ScreenSpaceTriLineMaterial'
import { simpleTweener } from '~/systems/animation/tweeners'

import ScreenSpaceTriLineGeometry from './geometry/ScreenSpaceTriLineGeometry'

const __defaultOptions: ScreenSpaceTriLineMaterialOptions = {
  color: makeHSL(hues._12_coolCyan, 0.8, 0.5),
  point1: new Vector2(0, 0),
  point2: new Vector2(30, -30),
  lineLength: 100,
  point1Radius: 20,
  innerThickness: 1,
  outerThickness: 16,
  innerOpacity: 1,
  outerOpacity: 0.3,
  progressSharpness: 6,
  constantSizeOnScreen: false,
  prescale: 1
}

const __mat = new Matrix4()
export default class ScreenSpaceTriLineMesh extends Mesh<
  ScreenSpaceTriLineGeometry,
  ScreenSpaceTriLineMaterial
> {
  constructor(options: Partial<ScreenSpaceTriLineMaterialOptions>) {
    const fullOptions = {
      ...__defaultOptions,
      ...options
    }
    super(
      new ScreenSpaceTriLineGeometry(),
      new ScreenSpaceTriLineMaterial(fullOptions)
    )
    this.onBeforeRender = (
      renderer: WebGLRenderer,
      scene: Scene,
      camera: Camera
    ) => {
      if (this.material.pointsDirty) {
        this.material.updatePoints()
      }
      // super.onBeforeRender(renderer, scene, camera, geometry, material, group) //nothing there
      const clipPos = this.material.uniforms.clipSpacePosition.value as Vector4
      __mat
        .multiplyMatrices(camera.matrixWorldInverse, this.matrixWorld)
        .premultiply(camera.projectionMatrix) //.multiply(camera.projectionMatrix)
      clipPos.set(0, 0, 0, 1).applyMatrix4(__mat)
    }
    simpleTweener.to({
      description: 'triline progress',
      target: this as ScreenSpaceTriLineMesh,
      propertyGoals: { progress: 1 + 1 / fullOptions.progressSharpness! },
      duration: 2000,
      delay: 500
    })
  }

  set progress(value: number) {
    this.material.progress = value
  }
  get progress() {
    return this.material.progress
  }
}
