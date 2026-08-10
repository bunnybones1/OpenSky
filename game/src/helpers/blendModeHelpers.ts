import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { wrap } from '@opensky/shared/utils/math'
import {
  AddEquation,
  BlendingDstFactor,
  BlendingSrcFactor,
  CustomBlending,
  DstAlphaFactor,
  DstColorFactor,
  Material,
  MaterialParameters,
  Mesh,
  OneFactor,
  OneMinusDstAlphaFactor,
  OneMinusDstColorFactor,
  OneMinusSrcAlphaFactor,
  OneMinusSrcColorFactor,
  Points,
  ReverseSubtractEquation,
  SrcAlphaFactor,
  SrcAlphaSaturateFactor,
  SrcColorFactor,
  SubtractEquation,
  Vector2,
  ZeroFactor
} from 'three'

import { getMeshMaterial } from '~/utils/getMeshMaterial'
import NiceVector2Parameter from '~/utils/NiceVector2Parameter'

export type SupportedBlendMode =
  | 'screen'
  | 'screenAlpha'
  | 'normal'
  | 'normalAlpha'
  | 'multiply'
  | 'customSubAlpha'
  | 'customAntiSubAlpha'
  | 'customAddAlpha'

export const blendModeParams: {
  [id in SupportedBlendMode]: Partial<MaterialParameters>
} = {
  screen: {
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneMinusDstColorFactor,
    blendDst: OneFactor,
    transparent: true
  },
  screenAlpha: {
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: SrcAlphaFactor,
    blendDst: OneFactor,
    transparent: true
  },
  normal: {},
  normalAlpha: {
    transparent: true,
    depthWrite: false
  },
  multiply: {
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: DstColorFactor,
    blendDst: OneMinusSrcAlphaFactor
  },
  customAddAlpha: {
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: SrcAlphaFactor,
    blendDst: OneFactor,
    transparent: true
  },
  customSubAlpha: {
    transparent: true,
    blending: CustomBlending,
    blendEquation: SubtractEquation,
    blendSrc: SrcAlphaSaturateFactor,
    blendDst: OneMinusDstAlphaFactor,
    depthWrite: false
  },
  customAntiSubAlpha: {
    transparent: true,
    blending: CustomBlending,
    blendEquation: ReverseSubtractEquation,
    blendSrc: SrcAlphaSaturateFactor,
    blendDst: OneMinusDstAlphaFactor,
    depthWrite: false
  }
}

const __dstFactors = [
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  OneMinusSrcColorFactor,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  DstAlphaFactor,
  OneMinusDstAlphaFactor,
  DstColorFactor,
  OneMinusDstColorFactor
]
const __srcFactors: Array<BlendingSrcFactor | BlendingDstFactor> =
  __dstFactors.slice()
__srcFactors.push(SrcAlphaSaturateFactor)

const blendModeComboSelector = new NiceVector2Parameter(
  'blend-mode-experimental',
  'Blend Mode',
  new Vector2(0, 0),
  'missiles',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.001
)

function fToD(f: number) {
  return ~~(__dstFactors.length * wrap(f, 0, 1))
}
function fToS(f: number) {
  return ~~(__srcFactors.length * wrap(f, 0, 1))
}
blendModeComboSelector.customValueTextConverter = function (v2: Vector2) {
  return `s:${fToS(v2.x)} d:${fToD(v2.y)}`
}

const __materialsToAffect: Material[] = []
blendModeComboSelector.listen(v => {
  const params = getBlendModeParamsByVec2(v)
  for (const material of __materialsToAffect) {
    material.blendSrc = params.blendSrc!
    material.blendDst = params.blendDst!
  }
})

function getBlendModeParamsByVec2(v: Vector2) {
  const iSrc = fToS(v.x)
  const iDst = fToD(v.y)
  return getBlendModeParamsByIndices(iSrc, iDst)
}

export function getBlendModeParamsByIndices(
  iSrc: number,
  iDst: number
): Partial<MaterialParameters> {
  return {
    blendSrc: __srcFactors[iSrc],
    blendDst: __dstFactors[iDst]
  }
}

function applyBlendModeByIndices(
  material: Material,
  iSrc: number,
  iDst: number
) {
  const params = getBlendModeParamsByIndices(iSrc, iDst)
  material.blendSrc = params.blendSrc!
  material.blendDst = params.blendDst!
}
export function applyBlendModeByIndicesToMesh(
  mesh: Mesh | Points,
  iSrc: number,
  iDst: number
) {
  applyBlendModeByIndices(getMeshMaterial(mesh), iSrc, iDst)
}

export function applyBlendMode(
  mat: Material | MaterialParameters,
  blendModeName: SupportedBlendMode
) {
  for (const k of Object.keys(blendModeParams[blendModeName])) {
    //@ts-ignore
    mat[k] = blendModeParams.screen[k]
  }
}
