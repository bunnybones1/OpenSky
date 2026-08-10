import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import {
  Color,
  Material,
  Mesh,
  Object3D,
  RawShaderMaterial,
  Vector3
} from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_DARK_BLUE_GRADIENT } from '~/colors/colorLibrary'
import LinearGradientMaterial from '~/materials/LinearGradientMaterial'
import FireCracker from '~/meshes/FireCracker'
import Object2D from '~/meshes/Object2D'
import { scene } from '~/scenes/arena/scene'
import {
  Easing,
  makeRelativeTimelineRemap,
  nestEases
} from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { animationDelay } from '~/utils/asyncUtils'
import { clipToWorld } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { modifyMeshForCentroidAnimations } from '~/utils/experimentalGltfCleanup'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import { onNextFrame } from '~/utils/onNextFrame'

import { gameMode } from './envGameModeHelpers'
import { playSound } from './soundHelpers'
import { MatchEndType } from './typeHelpers'

const TARGET_TEXTMESH_WIDTH = 0.434 // from English, nice padding.

export default class MatchResolutionPlaque {
  private _uTime: { value: number }
  plaqueMesh: Promise<Mesh>
  actualPlaqueMesh: Mesh | undefined
  pivot: Object3D
  pivot2D: Object2D
  gradientTop: Mesh
  gradientBottom: Mesh
  private _headingText: TextMesh
  private _labelColorStart: Color
  private _labelColorEnd: Color
  private _originalWeight: number
  private _labelColor: Color
  private _gameModeText: TextMesh
  private _usernameText: TextMesh
  private _secondaryTexts: TextMesh[]
  private _pivotPosStart = new Vector3(0, 0.13, 0.2)
  private _meshPosStart = new Vector3(0, 0, 0)
  private _pivotPosEnd = new Vector3(0, 0, 0) //this gets reset via a raycast
  private _meshPosEnd = new Vector3(0, 0, 0.4)
  private _transformDriver = { value: 0 }
  private _pivotScaleStart: number = 0.2
  private _pivotScaleEnd: number = 2
  get transformDriver() {
    return this._transformDriver
  }
  constructor(endType: MatchEndType, name: string) {
    const pivot = new Object3D()
    pivot.rotation.x = Math.PI * 0.35

    this.pivot = pivot
    const initMesh = async () => {
      const plaqueAssetName =
        endType === 'defeat' ? 'plaqueDefeat' : 'plaqueVictory'
      const plaqueMeshName =
        endType === 'defeat' ? 'plaque-defeat' : 'plaque-victory'
      await getAssetsManager().loadAsset(plaqueAssetName)
      await getAssetsManager().loadAsset('particle')
      const plaqueMesh = getAssetsManager().fetchMeshDeepClone(
        plaqueAssetName,
        plaqueMeshName,
        undefined,
        true
      ) as Mesh
      const gradientTop = new Mesh(
        getSharedPlaneBufferGeometry(
          undefined,
          undefined,
          new Vector3(0, -0.5, 0)
        ),
        new LinearGradientMaterial({
          startColor: COLOR_DARK_BLUE_GRADIENT,
          endColor: COLOR_DARK_BLUE_GRADIENT,
          startOpacity: 1,
          endOpacity: 0
        })
      )
      const gradientBottom = new Mesh(
        getSharedPlaneBufferGeometry(),
        new LinearGradientMaterial({
          startColor: COLOR_DARK_BLUE_GRADIENT,
          endColor: COLOR_DARK_BLUE_GRADIENT,
          startOpacity: 0,
          endOpacity: 1
        })
      )
      this.gradientBottom = gradientBottom
      this.gradientTop = gradientTop
      gradientTop.scale.set(1, 0.32, 1)
      gradientTop.position.set(0, 0.215, -0.2)
      gradientTop.rotation.x = Math.PI * -0.35
      gradientBottom.scale.set(1, 0.15, 1)
      gradientBottom.position.set(0, 0.05, 0.3)
      if (device.aspect < 1.5) {
        gradientBottom.position.z += 0.03
      }
      modifyMeshForCentroidAnimations(plaqueMesh)

      const endColors: { [K in MatchEndType]: Color } = {
        victory: new Color(0x33aaff),
        defeat: new Color(0xee2200),
        tie: new Color(0xffaa33)
      }
      this._labelColor = new Color(0xffffff)
      this._labelColorStart = endColors[endType]
      this._labelColorEnd = new Color(0xffffff)
      const labelOptions: textOptions.TextOptions = {
        ...textOptions.matchEndPlaqueUserName,
        color: this._labelColor,
        size: 340,
        align: 'center',
        scaleDownToPhysicalSize: true
      }
      this._originalWeight = labelOptions.weight + 1
      const headingText = new TextMesh(
        i18n.t(`ui.endTypeMessages.${endType}`)!,
        labelOptions,
        undefined,
        undefined,
        undefined,
        tm => {
          const ratio = TARGET_TEXTMESH_WIDTH / tm.width
          tm.scale.setScalar(ratio)
        },
        false
      )
      headingText.color = this._labelColor
      headingText.position.z = -0.015
      headingText.rotation.x = Math.PI * -0.5
      headingText.renderOrder = 10
      plaqueMesh.add(headingText)

      const uTime: { value: number } = { value: 0 }
      ;(plaqueMesh.material as RawShaderMaterial).uniforms.uCentroidTime = uTime
      this._headingText = headingText
      this._uTime = uTime

      const usernameText = new TextMesh(
        name,
        textOptions.matchEndPlaqueUserName,
        undefined,
        undefined,
        undefined,
        undefined,
        false
      )
      usernameText.rotation.x = Math.PI * -0.5
      usernameText.position.z = -0.23
      usernameText.renderOrder = 10
      plaqueMesh.add(usernameText)
      this._usernameText = usernameText

      let modeText = i18n.t(`ui.gameModeTitles.${gameMode}`)

      const modeSubtext = i18n.t(`ui.gameModeSubtext.${gameMode}`)
      if (modeSubtext.length > 0) {
        modeText += ` (${modeSubtext})`
      }
      const gameModeText = new TextMesh(
        modeText,
        textOptions.matchEndPlaqueUserName,
        undefined,
        undefined,
        undefined,
        undefined,
        false
      )
      gameModeText.rotation.x = Math.PI * -0.5
      gameModeText.position.z = 0.23
      plaqueMesh.add(gameModeText)
      gameModeText.renderOrder = 10
      this._gameModeText = gameModeText
      pivot.add(plaqueMesh)

      const timelineEaseMovePlaque = nestEases([
        makeRelativeTimelineRemap(1.09, 1, 0.91),
        Easing.Quintic.InOut
      ])

      const updateTransforms = () => {
        const meshLerpAmt = timelineEaseMovePlaque(this._transformDriver.value)
        pivot.scale.setScalar(
          lerp(this._pivotScaleStart, this._pivotScaleEnd, meshLerpAmt)
        )
        pivot.position
          .copy(this._pivotPosStart)
          .lerp(this._pivotPosEnd, meshLerpAmt)
        plaqueMesh.position
          .copy(this._meshPosStart)
          .lerp(this._meshPosEnd, meshLerpAmt)
      }
      const onMetricsUpdate = () => {
        onNextFrame(() => {
          this._pivotPosEnd.copy(
            clipToWorld(cameraShaker.camera, 0, 0.985, new Vector3(0, 0, 0.1))
          )
          this._pivotPosEnd.x = 0
          updateTransforms()
        })
      }

      listenToProperty(this._transformDriver, 'value', updateTransforms)
      listenToProperty(renderMetrics, 'uiHeight', h => {
        this._pivotScaleEnd = 80 / h
        onMetricsUpdate()
      })
      listenToProperty(renderMetrics, 'uiWidth', () => {
        onMetricsUpdate()
      })
      await onGlobalUiAccessReady
      const actionHistoryContainer =
        globalAccess.ui!.getContainer('actionHistory')
      actionHistoryContainer.sidebar.onAnimate(onMetricsUpdate)

      const secondaryTexts = [this._gameModeText, this._usernameText]
      this._secondaryTexts = secondaryTexts

      await getAssetsManager().loadAsset('audioFxMatchEnd')
      this.actualPlaqueMesh = plaqueMesh

      return plaqueMesh
    }
    this.plaqueMesh = initMesh()

    this.onUpdateMeshChunks = this._makePlaqueAnimator()
    this.onUpdateText = this._makeTextAnimator()
  }
  onUpdateMeshChunks: (v: number) => void
  onUpdateText: (v: number) => void

  private _makePlaqueAnimator() {
    const timelineEaseCentroids = makeRelativeTimelineRemap(0, 2, 1)
    const timelineEaseLabelWeight = nestEases([
      makeRelativeTimelineRemap(0.9, 0.2, 1.9),
      Easing.Quintic.InOut
    ])
    const timelineEaseLabelColor = nestEases([
      makeRelativeTimelineRemap(0.9, 0.3, 1.8),
      Easing.Quintic.InOut
    ])

    const onUpdate = (v: number) => {
      const opacity = lerp(0, 1, timelineEaseLabelColor(v))
      this._uTime.value = timelineEaseCentroids(v) * 2
      this._headingText.material.weight = lerp(
        -0.2,
        this._originalWeight,
        timelineEaseLabelWeight(v)
      )
      this._headingText.opacity = opacity
      ;(this.gradientTop.material as Material).opacity = opacity
      ;(this.gradientBottom.material as Material).opacity = opacity
      this.gradientTop.visible = opacity > 0
      this.gradientBottom.visible = opacity > 0
      this.actualPlaqueMesh!.visible = opacity > 0
      this._labelColor
        .copy(this._labelColorStart)
        .lerp(this._labelColorEnd, timelineEaseLabelColor(v))
      this._headingText.material.color = this._labelColor
    }
    return onUpdate
  }

  private _makeTextAnimator() {
    const timelineEaseTextOpacity = makeRelativeTimelineRemap(2, 0.5, 0.5)
    const onUpdate = (v: number) => {
      const opacity = timelineEaseTextOpacity(v)
      for (const text of this._secondaryTexts) {
        text.opacity = opacity
      }
    }
    return onUpdate
  }

  async animateOut(duration = 1500) {
    const target = { value: 0.43 }
    await simpleTweener.to({
      description: 'hide plaque',
      target,
      propertyGoals: { value: 0 },
      duration,
      easing: Easing.Quadratic.In,
      onUpdate: () => {
        this.onUpdateMeshChunks(target.value)
        this.onUpdateText(target.value + 0.4)
      }
    }).finished
  }

  async animateAllTheWayOut(duration = 1500) {
    const target = this._transformDriver
    await simpleTweener.to({
      description: 'hide plaque',
      target,
      propertyGoals: { value: 0 },
      duration,
      easing: Easing.Quadratic.In,
      onUpdate: () => {
        this.onUpdateMeshChunks(target.value)
        this.onUpdateText(target.value)
      }
    }).finished
  }

  async animateIn(duration = 3000) {
    const target = this._transformDriver
    if (target.value > 0) {
      return
    }
    playSound('audioFxMatchEnd', 'PlaqueSlam')

    const uTime = this._uTime
    const mesh = await this.plaqueMesh
    uTime.value = 0

    mesh.position.copy(this._meshPosStart)

    const anim = simpleTweener.to({
      description: 'show plaque',
      target,
      propertyGoals: { value: 1 },
      duration,
      onUpdate: () => {
        this.onUpdateMeshChunks(target.value)
        this.onUpdateText(target.value)
      }
    })

    await animationDelay(890)
    // timeWarp.add(0.2)
    await animationDelay(200)
    cameraShaker.add(0.4)
    await anim.finished
  }
  async hideSecondaryText() {
    if (!this._secondaryTexts[0].visible) {
      return
    }
    const target = { value: 1 }
    const secondaryTexts = this._secondaryTexts
    await simpleTweener.to({
      description: 'hide secondary text',
      target,
      propertyGoals: { value: 0 },
      duration: 400,
      onUpdate() {
        for (const text of secondaryTexts) {
          text.opacity = target.value
        }
      },
      onComplete() {
        for (const text of secondaryTexts) {
          text.visible = false
        }
      }
    }).finished
  }
  async changeMainText(newText: string, scale: number) {
    const mesh = await this.plaqueMesh
    const textMat = this._headingText.material
    const weightOn = textMat.weight
    const weightOff = textMat.weight - 1
    const target = { value: 1 }
    const scaleOriginal = (await this.plaqueMesh).scale.clone()
    const scalePulse = scaleOriginal.clone().multiplyScalar(1.2)
    const targetScale = { value: 0 }
    simpleTweener.to({
      description: 'match resolution text scale',
      delay: 100,
      target: targetScale,
      propertyGoals: { value: 1 },
      duration: 500,
      onUpdate() {
        mesh.scale
          .copy(scaleOriginal)
          .lerp(scalePulse, Easing.Custom.Pulse(targetScale.value))
      }
    })

    const flashColor = new Color(1, 1, 1)
    const fireCracker = new FireCracker(
      getAssetsManager().getAsset('particle'),
      fc => {
        fc.parent!.remove(fc)
      },
      160,
      40000,
      40000,
      500,
      0,
      flashColor
    )
    mesh.add(fireCracker)
    function onUpdate() {
      textMat.weight = lerp(weightOff, weightOn, target.value)
    }
    await simpleTweener.to({
      description: 'change text weight',
      target,
      propertyGoals: { value: 0 },
      duration: 200,
      onUpdate
    }).finished
    this._headingText.text = newText
    this._headingText.scale.setScalar(scale)
    await simpleTweener.to({
      description: 'change text weight2',
      target,
      propertyGoals: { value: 1 },
      duration: 200,
      onUpdate
    }).finished
  }
}

const plaques: Map<MatchEndType, MatchResolutionPlaque> = new Map()
let currentPlaque: MatchResolutionPlaque | undefined

export async function getMatchResolutionPlaque(
  endType: MatchEndType,
  name: string
): Promise<MatchResolutionPlaque>
export async function getMatchResolutionPlaque(): Promise<MatchResolutionPlaque>
export async function getMatchResolutionPlaque(
  endType?: MatchEndType,
  name?: string
): Promise<MatchResolutionPlaque> {
  if (endType) {
    if (plaques.has(endType)) {
      currentPlaque = plaques.get(endType)
    } else {
      currentPlaque = new MatchResolutionPlaque(endType, name!)
      plaques.set(endType, currentPlaque)
      await currentPlaque.plaqueMesh

      scene.add(currentPlaque.pivot)
      scene.add(currentPlaque.gradientTop)
      scene.add(currentPlaque.gradientBottom)
    }
  } else if (!currentPlaque) {
    throw new Error('Must pass an EndType the first time.')
  }
  return currentPlaque!
}

export async function hideMatchResolutionPlaque() {
  if (currentPlaque) {
    return (await getMatchResolutionPlaque()).animateOut()
  } else {
    return undefined
  }
}
