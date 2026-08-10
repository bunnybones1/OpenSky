import {
  Camera,
  Color,
  Mesh,
  Object3D,
  PlaneBufferGeometry,
  RawShaderMaterial,
  Scene
} from 'three'

const __fixedPlanesForAE: PlaneBufferGeometry[] = []

//aftereffects planes are 0, 0 top left corner
function __fixPlane(geo: PlaneBufferGeometry) {
  if (!__fixedPlanesForAE.includes(geo)) {
    const posArr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < posArr.length; i += 3) {
      posArr[i] += 0.5
      posArr[i + 1] += 0.5
    }
    __fixedPlanesForAE.push(geo)
  }
}

function __fixPlanes(base: Object3D) {
  base.traverse(child => {
    if (
      child instanceof Mesh &&
      child.geometry instanceof PlaneBufferGeometry
    ) {
      __fixPlane(child.geometry)
    }
  })
}

export class CompositionScene {
  scene: Scene
  camera: Camera
  private _sharedChannelMixerRed: Color | undefined
  private _sharedChannelMixerGreen: Color | undefined
  private _sharedChannelMixerBlue: Color | undefined
  constructor(scene: Scene) {
    this.scene = scene
    scene.traverse(obj => {
      obj.matrixAutoUpdate = false
      obj.updateMatrixWorld(true)
    })

    __fixPlanes(scene)

    this.camera = scene.children.find(
      child => child instanceof Camera
    ) as Camera
    if (!this.camera) {
      throw new Error('Could not find a camera')
    }

    scene.children.forEach(child => {
      if (
        child instanceof Mesh &&
        child.material instanceof RawShaderMaterial
      ) {
        if (child.material.uniforms.channelMixerRed) {
          if (!this._sharedChannelMixerRed) {
            this._sharedChannelMixerRed =
              child.material.uniforms.channelMixerRed.value
          } else {
            child.material.uniforms.channelMixerRed.value =
              this._sharedChannelMixerRed
          }
        }
        if (child.material.uniforms.channelMixerGreen) {
          if (!this._sharedChannelMixerGreen) {
            this._sharedChannelMixerGreen =
              child.material.uniforms.channelMixerGreen.value
          } else {
            child.material.uniforms.channelMixerGreen.value =
              this._sharedChannelMixerGreen
          }
        }
        if (child.material.uniforms.channelMixerBlue) {
          if (!this._sharedChannelMixerBlue) {
            this._sharedChannelMixerBlue =
              child.material.uniforms.channelMixerBlue.value
          } else {
            child.material.uniforms.channelMixerBlue.value =
              this._sharedChannelMixerBlue
          }
        }
      }
    })
  }

  set red(color: Color) {
    this._sharedChannelMixerRed!.copy(color)
  }
  set green(color: Color) {
    this._sharedChannelMixerGreen!.copy(color)
  }
  set blue(color: Color) {
    this._sharedChannelMixerBlue!.copy(color)
  }
}
