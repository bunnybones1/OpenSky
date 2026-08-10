import { renderMetrics } from '@opensky/shared/renderMetrics'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  SphereBufferGeometry
} from 'three'

import { getAssetsManager } from '~/assets'
import { makeHSL } from '~/colors/utils'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import worldPositionCacheManager from '~/helpers/worldPositionCacheManager'
import Object2D from '~/meshes/Object2D'
import Emitter from '~/meshes/Particles/Emitter'
import {
  ParticleRenderObject,
  ParticleSystem
} from '~/meshes/Particles/particleHelpers'
import {
  illuminatedSmokeColorBottom,
  illuminatedSmokeColorTop
} from '~/meshes/Particles/particleSettingsLib'
import queryParamColors from '~/queryParamColors'
import queryParams from '~/queryParams'
import { UI } from '~/scenes/ui'
import NumberRangeDisplayBar from '~/scenes/ui/components/NumberRangeDisplayBar'
import { get2DPositionAtDepth } from '~/utils/camera'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

const __fountainRotationsPerSecond = 0.2
const __fountainRadius = 0.2

export class TestParticlesBaseScene extends BaseTestScene {
  protected _floorColor = makeHSL(0.6, 0.4, 0.4)
  protected _bgColor = queryParamColors.bgColor || makeHSL(0.55, 0.4, 0.55)
  protected _underLightColor = this._floorColor.clone().lerp(this._bgColor, 0.5)
  protected _skyLightColor = new Color(1, 1, 0.9)
  protected _isReady: Promise<void>
  protected _fountainEmitters: Array<{
    emitter: Emitter
    particleRenderObject: ParticleRenderObject
    particlesPerMeter: number
  }> = []
  protected _particleRenderObjects: ParticleRenderObject[] = []

  constructor() {
    super()

    const floorMat = new MeshBasicMaterial({
      color: this._floorColor
      // wireframe: true
    })
    floorMat.color = this._floorColor
    this._floorColor.setHSL(0.1, 0.5, 0.4)
    const floor = new Mesh(new PlaneBufferGeometry(1, 1, 10, 10), floorMat)
    floor.rotation.x = Math.PI * -0.5
    this.bgColor.copy(this._bgColor)

    const lightMat = new MeshBasicMaterial({
      color: this._skyLightColor
    })
    const lightSource = new Mesh(new SphereBufferGeometry(1.4, 8, 6), lightMat)
    lightMat.color = this._skyLightColor
    this._skyLightColor.setHSL(0.5, 0.7, 0.6)
    this._skyLightColor.multiplyScalar(2)
    lightSource.position.z -= 2.5
    lightSource.position.y += 0.2
    lightSource.scale.y *= 0.2

    if (!queryParams.isolate) {
      this.scene.add(floor)
      this.scene.add(lightSource)
    }

    this._isReady = this.init()
  }
  async init() {
    await getAssetsManager().loadAsset('audioFxCommon')
    const initdLauncherObjects = this.initParticleSystem()

    for (const pro of initdLauncherObjects.particleRenderObjects) {
      this.scene.add(pro)
    }
    this._particleRenderObjects = initdLauncherObjects.particleRenderObjects
    initdLauncherObjects.launcher.startTestVolley()

    this.camera.updateMatrix()
    this.camera.updateMatrixWorld(true)

    const fountainEmitters = initdLauncherObjects.writers.map(writer => {
      const particleRenderObject = writer.particleRenderObject
      const emitter = particleRenderObject.geometry.createBeamEmitter(
        this.getHitPos(renderMetrics.width * 0.5, renderMetrics.height * 0.5),
        writer.pathMaker
      )
      emitter.position.y = 0.05
      emitter.visible = false
      return {
        emitter,
        particleRenderObject,
        particlesPerMeter: writer.particlesPerMeter
      }
    })

    this._fountainEmitters = fountainEmitters
  }

  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await this._isReady
    const container = ui.getContainer('randomTests')
    let cursorY = -5
    const barHeight = 16
    const bars: Object2D[] = []
    for (const pro of this._particleRenderObjects) {
      const bufferRenderBar = new NumberRangeDisplayBar(
        pro.geometry.totalIndices,
        pro.name + ' render'
      )
      bufferRenderBar.mesh.matrix.setConstraints(
        new Pin(1, 0, -160, barHeight),
        ReadonlyPin.Bottom,
        ReadonlyPin.Bottom.cloneOffset(0, cursorY)
      )
      cursorY -= barHeight + 1
      bars.push(bufferRenderBar.mesh)

      const bufferUpdateBar = new NumberRangeDisplayBar(
        pro.geometry.total,
        pro.name + ' update'
      )

      bufferUpdateBar.mesh.matrix.setConstraints(
        new Pin(1, 0, -160, barHeight),
        ReadonlyPin.Bottom,
        ReadonlyPin.Bottom.cloneOffset(0, cursorY)
      )
      cursorY -= barHeight + 4
      bars.push(bufferUpdateBar.mesh)

      listenToProperty(
        pro.geometry,
        'renderStartWrapped',
        v => (bufferRenderBar.parameterLow.value = v)
      )

      listenToProperty(
        pro.geometry,
        'renderEndWrapped',
        v => (bufferRenderBar.parameterHigh.value = v)
      )

      listenToProperty(
        pro.geometry.updateRange,
        'offset',
        v => (bufferUpdateBar.parameterLow.value = v)
      )

      listenToProperty(pro.geometry.updateRange, 'count', v => {
        if (v !== -1) {
          bufferUpdateBar.parameterHigh.value =
            bufferUpdateBar.parameterLow.value + v
        }
      })
    }

    for (const bar of bars) {
      bar.visible = false
      container.add(bar)
    }

    const buttonDatas = this._fountainEmitters.map(
      fe =>
        new QuickButtonData(`peek ${fe.particleRenderObject.name}`, () => {
          fe.emitter.visible = !fe.emitter.visible
        })
    )
    buttonDatas.push(
      new QuickButtonData('toggle bars', () => {
        for (const bar of bars) {
          bar.visible = !bar.visible
        }
      })
    )
    makeQuickButtonColumn(
      container,
      buttonDatas,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-20, -100)
    )

    await container.ready
    container.show()

    await this._isReady

    super.initUI(ui)
  }

  update(dt: number) {
    for (let i = 0; i < this._fountainEmitters.length; i++) {
      const fountain = this._fountainEmitters[i]
      const ratio = i / this._fountainEmitters.length
      const radians =
        (ratio + __fountainRotationsPerSecond * this.time) * Math.PI * 2
      const em = fountain.emitter
      const pos = em.position.clone()
      pos.x = Math.cos(radians) * __fountainRadius
      pos.z = Math.sin(radians) * __fountainRadius
      em.lookAt(pos)
      em.update(pos, em.quaternion, 0, fountain.particlesPerMeter)
    }
    for (const pro of this._particleRenderObjects) {
      pro.geometry.update(dt)
    }

    this._floorColor.setHSL(this.time * 0.1, 0.2, 0.5)

    this._underLightColor.copy(this._floorColor).lerp(this._bgColor, 0.5)

    this._skyLightColor.setHSL(this.time * 0.25 + 0.5, 0.7, 0.6)
    this._skyLightColor.multiplyScalar(1.5)

    illuminatedSmokeColorTop.copy(this._skyLightColor)
    illuminatedSmokeColorBottom.copy(this._underLightColor)

    super.update(dt)
  }
  protected initParticleSystem(): ParticleSystem {
    throw new Error('override this method in your test')
  }
  protected getHitPos(x: number, y: number) {
    const camWorldPos = worldPositionCacheManager.once(this.camera)
    return get2DPositionAtDepth(
      this.camera,
      camWorldPos,
      (x / renderMetrics.width) * 2 - 1,
      -(y / renderMetrics.height) * 2 + 1,
      0
    )
  }
}
export const scene = TestParticlesBaseScene
