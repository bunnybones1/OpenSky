import { nextHighestPowerOfTwo } from '@opensky/shared/utils/math'
import {
  BufferGeometry,
  Camera,
  // GammaEncoding,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PlaneBufferGeometry,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  Texture,
  UnsignedByteType,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'

import TemporalColorStripUnpackingMaterial from '~/materials/TemporalColorStripUnpackingMaterial'

export default class TemporalColorStripHandler {
  renderTarget: WebGLRenderTarget
  renderer: WebGLRenderer
  scene: Scene
  camera: Camera
  temporalMaterial: TemporalColorStripUnpackingMaterial
  height: number
  textureSize: Vector2

  constructor(
    colorStrip: Texture,
    renderer: WebGLRenderer,
    mapFrameWidth: number = 8,
    mapFrameHeight: number = 5,
    mapFrames: number = 48,
    invGammaColor?: Color
  ) {
    colorStrip.minFilter = NearestFilter
    colorStrip.magFilter = NearestFilter
    const camera: Camera = new OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5
    )
    const scene: Scene = new Scene()
    scene.autoUpdate = false
    scene.matrixAutoUpdate = false
    const material: TemporalColorStripUnpackingMaterial =
      new TemporalColorStripUnpackingMaterial(
        colorStrip,
        mapFrameHeight,
        mapFrames,
        colorStrip.image.height,
        undefined,
        invGammaColor
      )
    const nextNearestHeight: number = nextHighestPowerOfTwo(mapFrameHeight)
    const plane: Mesh = new Mesh(
      new PlaneBufferGeometry(1, mapFrameHeight / nextNearestHeight, 1, 1),
      material
    )
    plane.frustumCulled = false
    plane.position.y += (1 - mapFrameHeight / nextNearestHeight) * 0.5

    const geometry: BufferGeometry = plane.geometry as BufferGeometry
    const uvArray: Float32Array = geometry.attributes.uv.array as Float32Array
    const total = geometry.attributes.uv.count
    const scale: Vector2 = new Vector2(
      1,
      mapFrameHeight / colorStrip.image.height
    )
    for (let i = 0; i < total; i++) {
      const i2 = i * 2
      uvArray[i2 + 1] = uvArray[i2 + 1] * scale.y
    }

    const size = new Vector2(mapFrameWidth, nextNearestHeight)

    const renderTarget = new WebGLRenderTarget(size.x, size.y, {
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
      anisotropy: 1,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false
      //   encoding: GammaEncoding //this is correct, but missing from types
    })
    // renderTarget.texture.encoding = GammaEncoding //workaround until types are fixed

    scene.add(camera)
    scene.add(plane)
    scene.updateMatrixWorld(true)

    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.renderTarget = renderTarget
    this.temporalMaterial = material
    this.height = nextNearestHeight
    this.textureSize = size
  }

  update() {
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(null)
  }
  set progress(value: number) {
    this.temporalMaterial.progress = value
  }
  get progress(): number {
    return this.temporalMaterial.progress
  }

  get texture(): Texture {
    return this.renderTarget.texture
  }

  getPreviewMesh(): Mesh {
    return new Mesh(
      new PlaneBufferGeometry(1, 2, 1, 1),
      new MeshBasicMaterial({ map: this.texture })
    )
  }
}
