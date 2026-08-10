import { renderMetrics } from '@opensky/shared/renderMetrics'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import worldPositionCacheManager from '~/helpers/worldPositionCacheManager'
import Emitter from '~/meshes/Particles/Emitter'
import missileParticlePathMakerLib from '~/meshes/Particles/missileParticlePathMakerLib'
import SparkRibbons from '~/meshes/Particles/QuadraticRibbonsMesh'
import { UI } from '~/scenes/ui'
import NumberRangeDisplayBar from '~/scenes/ui/components/NumberRangeDisplayBar'
import inputProvider from '~/systems/input/input'
import { get2DPositionAtDepth } from '~/utils/camera'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestRibbonSmokeScene extends BaseTestScene {
  private _fountainEmitters: Emitter[] = []
  private _sparks: SparkRibbons
  private _cursorEmitter: Emitter

  private _bufferUpdateBar: NumberRangeDisplayBar
  private _bufferRenderBar: NumberRangeDisplayBar

  constructor() {
    super()
    this.init()
  }
  init() {
    this.regenerateSparks(1000)
  }

  onPressStartMoveEmitter = (x: number, y: number) => {
    this._cursorEmitter.update(
      this.getHitPos(x, y),
      this._cursorEmitter.quaternion,
      0,
      0
    )
  }
  onDragMoveEmitter = (x: number, y: number) => {
    const pos = this.getHitPos(x, y)
    this._cursorEmitter.lookAt(pos)
    this._cursorEmitter.update(pos, this._cursorEmitter.quaternion, 200, 0)
  }
  onUpdateRangeOffsetChange = (v: number) => {
    if (this._bufferUpdateBar) {
      this._bufferUpdateBar.parameterLow.value = v
    }
  }
  onUpdateRangeCountChange = (v: number) => {
    if (this._bufferUpdateBar && v !== -1) {
      this._bufferUpdateBar.parameterHigh.value =
        this._bufferUpdateBar.parameterLow.value + v
    }
  }
  onRenderStartWrappedChange = (v: number) => {
    if (this._bufferRenderBar) {
      this._bufferRenderBar.parameterLow.value = v
    }
  }
  onRenderEndWrappedChange = (v: number) => {
    if (this._bufferRenderBar) {
      this._bufferRenderBar.parameterHigh.value = v
    }
  }
  regenerateSparks(total: number) {
    if (this._sparks) {
      this.scene.remove(this._sparks)

      stopListeningToProperty(
        this._sparks.geometry,
        'renderStartWrapped',
        this.onRenderStartWrappedChange
      )

      stopListeningToProperty(
        this._sparks.geometry,
        'renderEndWrapped',
        this.onRenderEndWrappedChange
      )

      stopListeningToProperty(
        this._sparks.geometry.updateRange,
        'offset',
        this.onUpdateRangeOffsetChange
      )

      stopListeningToProperty(
        this._sparks.geometry.updateRange,
        'count',
        this.onUpdateRangeCountChange
      )
    }
    const trianglesPerStrip = 16
    const sparks = new SparkRibbons({
      total,
      speed: 0.3,
      trianglesPerRibbon: trianglesPerStrip,
      matOptions: {
        colorTexture: 'brushStroke',
        strokePathFraction: 0.4,
        relativeWidth: 0.015,
        distortionTexture: 'noise3Map',
        distortionScale: 2,
        distortionStrength: 0.03,
        quantizeVertsAlongTime: true,
        blendMode: 'multiply',
        opacity: 0.5
      }
    })
    this.scene.add(sparks)

    this.camera.updateMatrix()
    this.camera.updateMatrixWorld(true)

    const cursorEmitter = sparks.geometry.createEmitter(
      new Vector3(),
      missileParticlePathMakerLib.smoke
    )
    inputProvider.onPressStart.addListener(this.onPressStartMoveEmitter)

    inputProvider.onDrag.addListener(this.onDragMoveEmitter)

    const fountainEmitters = [
      { ssx: 0.3, ssy: 0.4, anglez: 0.4 },
      { ssx: 0.4, ssy: 0.5, anglez: 0.2 },
      { ssx: 0.5, ssy: 0.6, anglez: 0, on: true },
      { ssx: 0.6, ssy: 0.5, anglez: -0.2 },
      { ssx: 0.7, ssy: 0.4, anglez: -0.4 }
    ].map(props => {
      console.log(
        'renderMetrics.width, renderMetrics.height',
        renderMetrics.width,
        renderMetrics.height
      )
      const f = sparks.geometry.createEmitter(
        this.getHitPos(
          renderMetrics.width * props.ssx,
          renderMetrics.height * props.ssy
        ),
        missileParticlePathMakerLib.smoke
      )
      f.rotation.z = props.anglez
      f.visible = !!props.on
      return f
    })

    if (this._bufferRenderBar) {
      this._bufferRenderBar.max = sparks.geometry.totalIndices
    }

    if (this._bufferUpdateBar) {
      this._bufferUpdateBar.max = sparks.geometry.total
    }

    listenToProperty(
      sparks.geometry,
      'renderStartWrapped',
      this.onRenderStartWrappedChange
    )

    listenToProperty(
      sparks.geometry,
      'renderEndWrapped',
      this.onRenderEndWrappedChange
    )

    listenToProperty(
      sparks.geometry.updateRange,
      'offset',
      this.onUpdateRangeOffsetChange
    )

    listenToProperty(
      sparks.geometry.updateRange,
      'count',
      this.onUpdateRangeCountChange
    )

    this._cursorEmitter = cursorEmitter
    this._sparks = sparks
    this._fountainEmitters = fountainEmitters
  }
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    const container = ui.getContainer('randomTests')
    await container.ready
    container.show()

    const bufferRenderBar = new NumberRangeDisplayBar(
      this._sparks.geometry.totalIndices,
      'render'
    )

    bufferRenderBar.mesh.matrix.setConstraints(
      new Pin(1, 0, -160, 40),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -5)
    )
    container.add(bufferRenderBar.mesh)

    const bufferUpdateBar = new NumberRangeDisplayBar(
      this._sparks.geometry.total,
      'update'
    )

    bufferUpdateBar.mesh.matrix.setConstraints(
      new Pin(1, 0, -160, 40),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -50)
    )
    container.add(bufferUpdateBar.mesh)

    const buttonDatas = this._fountainEmitters.map((f, i) => {
      const j = i
      return new QuickButtonData(`toggle emitter ${i + 1}`, () => {
        this._fountainEmitters[j].visible = !this._fountainEmitters[j].visible
      })
    })
    buttonDatas.push(
      new QuickButtonData('double buffer', () => {
        this.regenerateSparks(this._sparks.geometry.totalRibbons * 2)
      })
    )
    buttonDatas.push(
      new QuickButtonData('half buffer', () => {
        this.regenerateSparks(this._sparks.geometry.totalRibbons * 0.5)
      })
    )
    makeQuickButtonColumn(
      container,
      buttonDatas,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-20, -100)
    )

    this._bufferUpdateBar = bufferUpdateBar
    this._bufferRenderBar = bufferRenderBar

    super.initUI(ui)
  }

  update(dt: number) {
    if (this._sparks) {
      this._sparks.geometry.update(dt)
      for (const fountain of this._fountainEmitters) {
        fountain.rotation.y += 0.6 * dt
        fountain.update(fountain.position, fountain.quaternion, 0, 20)
      }
    }
    super.update(dt)
  }
  private getHitPos(x: number, y: number) {
    const camWorldPos = worldPositionCacheManager.once(this.rayCamera)
    return get2DPositionAtDepth(
      this.rayCamera,
      camWorldPos,
      (x / renderMetrics.width) * 2 - 1,
      -(y / renderMetrics.height) * 2 + 1,
      0
    )
  }
}
export const scene = TestRibbonSmokeScene
