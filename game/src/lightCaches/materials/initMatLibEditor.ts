import { clamp } from '@opensky/shared/utils/math'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import NiceParameter from '@opensky/shared/utils/NiceParameter'
import { Color } from 'three'

import { Debuggable, debuggables } from '~/debug/debugRegistry'
import { createNiceModal } from '~/utils/createNiceModal'
import NiceColorParameter from '~/utils/NiceColorParameter'
import NiceMethod from '~/utils/NiceMethod'
import { registerDebugModalCategory } from '~/utils/registerDebugModalCategory'
import { createCloseDebugOverlay } from '~/utils/ui'

import { toggleLightCacheFudgeMode } from './lightCacheFudgeModeToggle'
import {
  __exportLightCacheMaterialParamsLibrary,
  __matParamsChangeHandler,
  __previousResetMaterialsRequest,
  lightCacheMaterialParamsLibrary,
  lightCacheMaterialParamsLibraryKeys
} from './lightCacheMatLib'
import { LightCacheMeshMaterialParameters } from './LightCacheMeshMaterial'
import { resetLightCacheMaterialParamsLibrary } from './resetLightCacheMaterialParamsLibrary'

export function initMatLibEditor() {
  class FloatRange {
    constructor(
      public min: number,
      public max: number
    ) {
      //
    }
  }
  function getFloatRange(
    key: Extract<keyof LightCacheMeshMaterialParameters, string>
  ) {
    switch (key) {
      case 'opacity':
        return new FloatRange(-1, 2)
      case 'diffusionRoughness':
      case 'reflectionRoughness':
      case 'transmissionRoughness':
        return new FloatRange(0, 8)
      // case 'noiseFineness':
      //   return new FloatRange(1, 6000)
      // case 'lightCacheUVScale':
      //   return new FloatRange(1, 64)
      default:
        return new FloatRange(0, 1)
    }
  }
  function getFloatDistribution(
    key: Extract<keyof LightCacheMeshMaterialParameters, string>
  ): (v: number) => number {
    switch (key) {
      // case 'noiseFineness':
      //   return v => Math.pow(clamp(v * 1.2 - 0.1, 0, 1), 2)
      default:
        return v => clamp(v * 1.2 - 0.1, 0, 1)
    }
  }
  for (const materialName of lightCacheMaterialParamsLibraryKeys) {
    const matParams = lightCacheMaterialParamsLibrary[materialName]
    const niceParams: Array<NiceParameter<any>> = []
    Object.keys(matParams).forEach(
      (key: Extract<keyof typeof matParams, string>) => {
        const item = matParams[key]
        if (item !== undefined) {
          if (item instanceof Color) {
            const niceParam = new NiceColorParameter(
              `materialProp-${materialName}-${key}`,
              key,
              item,
              'never',
              __previousResetMaterialsRequest,
              0,
              true
            )
            niceParam.listen(v => {
              // @ts-ignore
              matParams[key].copy(v)
              __matParamsChangeHandler(matParams)
            })
            niceParams.push(niceParam)
            // } else if (item instanceof Texture) {
            //nothing
          } else if (item === true || item === false) {
            const niceParam = new NiceBooleanParameter(
              `materialProp-${materialName}-${key}`,
              key,
              item,
              'never',
              undefined,
              __previousResetMaterialsRequest,
              0,
              true
            )
            niceParam.listen(v => {
              // @ts-ignore
              matParams[key] = v
              __matParamsChangeHandler(matParams)
            })
            niceParams.push(niceParam)
          } else if (typeof item === 'string') {
            // debugger
            //nothing
            // } else if (item instanceof Vector2) {
            //   // const floatRange = getFloatRange(key)
            //   const niceParam = new NiceVector2Parameter(
            //     `materialProp-${materialName}-${key}`,
            //     key,
            //     item,
            //     'never',
            //     __previousResetMaterialsRequest,
            //     0,
            //     true
            //   )
            //   niceParam.listen(v => {
            //     // @ts-ignore
            //     matParams[key].copy(v)
            //     __matParamsChangeHandler(matParams)
            //   })
            //   niceParams.push(niceParam)
          } else if (typeof item === 'number') {
            //@ts-ignore
            const floatRange = getFloatRange(key)
            const niceParam = new NiceFloatParameter(
              `materialProp-${materialName}-${key}`,
              key,
              item,
              floatRange.min,
              floatRange.max,
              //@ts-ignore
              getFloatDistribution(key),
              v => '' + v,
              'never',
              __previousResetMaterialsRequest,
              0.001,
              0,
              true
            )
            niceParam.listen(v => {
              // @ts-ignore
              matParams[key] = v
              __matParamsChangeHandler(matParams)
            })
            niceParams.push(niceParam)
          }
        }
      }
    )
    debuggables.register(
      'graphics/materials/' + materialName,
      new Debuggable(async () => {
        const overlay = createCloseDebugOverlay()
        const { modal, updateModalScroller } = await createNiceModal(
          niceParams,
          'bottom'
        )
        return [overlay, modal.mesh, updateModalScroller]
      })
    )
    __matParamsChangeHandler(matParams)
  }

  new NiceMethod(
    'Material Library',
    __exportLightCacheMaterialParamsLibrary,
    'Export',
    'materials',
    0
  )

  new NiceMethod(
    'Material Library',
    resetLightCacheMaterialParamsLibrary,
    'Reset & Reload',
    'materials',
    0
  )

  new NiceMethod(
    'Toggle Fudge Mode',
    toggleLightCacheFudgeMode,
    'Toggle Fudge & Reload',
    'materials',
    0
  )

  registerDebugModalCategory('graphics', 'materials')
}
