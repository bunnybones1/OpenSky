import { makeSafetyCheckFromConstStringArray } from '@opensky/shared/typeHelpers'
import { DoubleSide, IUniform, Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import { COLOR_WHITE } from '~/colors/colorLibrary'
import { RENDER_ORDERS } from '~/constants'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import BasicVertexColorMeshMaterial from '~/materials/BasicVertexColorMeshMaterial'
import ZShadowMeshMaterial from '~/materials/ZShadowMeshMaterial'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

const meshIconBaseNames = [
  'dust',
  'eye',
  'buff-arrow-encircled',
  'buff-arrow-encircled-flipped-up'
] as const

const isMeshIconBaseName =
  makeSafetyCheckFromConstStringArray(meshIconBaseNames)

const textureIconNames = [
  'Draw',
  'Mulligan',
  'ReturnToHand',
  'SendToDeck',
  'SendToGraveyard',
  'Summon',
  'Death'
] as const
const isTextureIconName = makeSafetyCheckFromConstStringArray(textureIconNames)

export type IconIndicatorName =
  | (typeof meshIconBaseNames)[number]
  | (typeof textureIconNames)[number]

export default class IconIndicator extends Object3D {
  private _opacityUniform: IUniform
  set opacity(val: number) {
    this._opacityUniform.value = val
  }
  get opacity() {
    return this._opacityUniform.value
  }
  constructor(iconName: IconIndicatorName, shouldHaveShadow = true) {
    super()
    if (isMeshIconBaseName(iconName)) {
      this.buildMesh(iconName, shouldHaveShadow)
    } else if (isTextureIconName(iconName)) {
      this.buildTexture(iconName)
    } else {
      throw new Error(
        `No icon indicator named ${iconName} exists as mesh or texture`
      )
    }
  }
  private buildMesh(
    iconName: (typeof meshIconBaseNames)[number],
    shouldHaveShadow = true
  ) {
    const iconMesh = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesGraphical',
      `ui-icon-${iconName}`,
      true,
      true
    ) as Mesh
    iconMesh.renderOrder = RENDER_ORDERS.damage
    iconMesh.position.set(0, 0, 0)
    const s = 10 //?
    iconMesh.scale.set(s, s, s)
    iconMesh.rotation.x = -Math.PI * 0.5
    iconMesh.frustumCulled = false
    this.add(iconMesh)
    let shadowMesh: Mesh | undefined
    if (shouldHaveShadow) {
      shadowMesh = getAssetsManager().fetchMeshDeepClone(
        'gamePiecesGraphical',
        'zShadow-circle',
        true,
        true
      ) as Mesh
      shadowMesh.position.set(0, 0, 0.01)
      shadowMesh.rotation.set(Math.PI * -0.5, 0, 0)
      const s2 = s * 0.7
      shadowMesh.scale.set(s2, s2, s2)
      shadowMesh.frustumCulled = false
      shadowMesh.renderOrder = RENDER_ORDERS.damage - 100
      this.add(shadowMesh)
    }

    const iconMat = iconMesh.material as BasicVertexColorMeshMaterial
    iconMat.color = COLOR_WHITE
    iconMat.transparent = true

    const uOpacity = iconMat.uniforms.uOpacity
    if (shadowMesh) {
      ;(shadowMesh.material as ZShadowMeshMaterial).uniforms.uOpacity = uOpacity
    }
    this._opacityUniform = uOpacity
  }
  private buildTexture(iconName: (typeof textureIconNames)[number]) {
    const map = getAssetsManager().getAsset(`uiPreview${iconName}` as const)
    const iconMat = new BasicMapMeshMaterial(
      { map, supportOpacity: true },
      { depthWrite: false, side: DoubleSide, transparent: true }
    )
    const iconMesh = new Mesh(getSharedPlaneBufferGeometry(), iconMat)
    iconMesh.renderOrder = RENDER_ORDERS.damage
    const s = 0.35
    iconMesh.scale.set(s, s, s)
    iconMesh.frustumCulled = false
    this.add(iconMesh)

    this._opacityUniform = iconMat.uniforms.opacity
  }
}
