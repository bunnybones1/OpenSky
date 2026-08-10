import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { copyTextToClipboard } from '@opensky/shared/utils/copyToClipboard'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import { Color, DoubleSide, Mesh, Object3D, Vector2 } from 'three'

import LightCacheMeshMaterial, {
  LightCacheMeshMaterialParameters
} from './LightCacheMeshMaterial'

const __lightCacheMaterialParamsLibrary = {
  island: {
    matLibId: 'island',
    diffusionRoughness: 8,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionColor: new Color(0.825, 0.825, 0.825),
    transmissionAmount: 0,
    transmissionColor: new Color(
      1.4406291998831002,
      0.7837735245752326,
      0.8794561352286254
    ),
    transmissionRoughness: 8,
    transmissionInterpolation: true,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.3091976516634091,
      -1.8318679906315083e-15
    ),
    refractionZoom: 0.518,
    useMetallicDiffuse: true,
    fogFar: 10,
    fogNear: 0,
    fogColor: new Color(1, 0, 0)
  },
  cardFrame: {
    matLibId: 'cardFrame',
    diffusionInterpolation: false,
    diffusionColor: new Color(
      0.19716643590202695,
      0.11593012323861861,
      0.24236929277090186
    ),
    diffusionRoughness: 6.57,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.4901561972663016,
      0.49019956672376075,
      0.49019956672376075
    ),
    transmissionRoughness: 4.048,
    reflectionInterpolation: true,
    reflectionColor: new Color(
      0.44272370932615795,
      0.4122707812714095,
      0.49966468915780404
    ),
    reflectionRoughness: 4.727,
    transmissionAmount: 0,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(1.000000000000004, 0),
    refractionZoom: 0.227
  },
  cardFrameBackEdge: {
    matLibId: 'backEdgeCardFrame',
    diffusionColor: new Color(
      0.23084361489200692,
      0.19329374074603667,
      0.29779336746973284
    ),
    diffusionRoughness: 6.279,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionRoughness: 4.63,
    reflectionColor: new Color(
      0.1757940971105417,
      0.14330685626475564,
      0.2669040419139909
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(1, 1, 1),
    transmissionRoughness: 0.168,
    transmissionInterpolation: false,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(1, 0),
    refractionZoom: 0.121
  },
  founder: {
    matLibId: 'founder',
    diffusionColor: new Color(
      0.03760582184055393,
      0.029280021535254892,
      0.04297339889300673
    ),
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 1,
    reflectionColor: new Color(
      0.25359023345022635,
      0.2536126713402356,
      0.2536126713402356
    ),
    transmissionAmount: 0.809,
    transmissionColor: new Color(
      0.39913802424133793,
      0.3446554198774779,
      1.130264893470599
    ),
    transmissionRoughness: 8,
    transmissionInterpolation: false,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.17808219178082185,
      0
    ),
    refractionZoom: 0.094
  },
  cardFrameBack: {
    matLibId: 'cardFrameBack',
    diffusionColor: new Color(
      0.028125142091681148,
      0.018441512296953493,
      0.045666514354495584
    ),
    diffusionRoughness: 8,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionColor: new Color(
      0.9863437903715202,
      0.9864310629497142,
      0.9864310629497255
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(
      0.9232707964095136,
      0.9232910720845217,
      0.923291072084533
    ),
    transmissionRoughness: 0.168,
    transmissionInterpolation: false,
    refractionZoom: 0.121,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.11937377690802442, 0)
  },
  manaGem: {
    matLibId: 'manaGem',
    diffusionColor: new Color(
      -0.4864938479199922,
      -0.22100319954759212,
      -0.3032204162741465
    ),
    diffusionRoughness: 6.473,
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 5.115,
    reflectionColor: new Color(
      0.689841706313068,
      0.6899027441224467,
      0.6899027441224471
    ),
    transmissionAmount: 0.627,
    transmissionRoughness: 8,
    transmissionInterpolation: false,
    transmissionColor: new Color(
      -1.105487622463686,
      -1.0304962923317709,
      -0.6451522492316265
    ),
    refractionZoom: 0,
    emission: new Color(
      1.0019041065619392,
      0.9573622016815097,
      1.0170725887932937
    ),
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.5479452054794547,
      0.6027397260274026
    ),
    blackoutAfterEmission: true
  },
  manaVial: {
    matLibId: 'manaVial',
    diffusionColor: new Color(
      0.35138030489078087,
      0.6343257505856041,
      0.48639429283711144
    ),
    diffusionRoughness: 8,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionRoughness: 3.467,
    reflectionColor: new Color(
      -0.0777557875580886,
      0.03297475351288823,
      0.06597002179716607
    ),
    transmissionAmount: 0.87,
    transmissionRoughness: 6.861,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.7072218928085028,
      0.5884652960049068,
      0.30067271975628895
    ),
    refractionZoom: 0.882,
    emission: new Color(
      0.4156078750262925,
      0.4583431896299033,
      0.8212469810150317
    ),
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.6027397260273977, 0)
  },
  manaVialPurple: {
    matLibId: 'manaVialPurple',
    diffusionColor: new Color(
      0.2700813453981912,
      0.5515403864927058,
      0.2837216760988499
    ),
    diffusionRoughness: 0.5,
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 1,
    reflectionColor: new Color(
      0.4117927996744345,
      0.5225666564409924,
      0.5555619247252682
    ),
    transmissionAmount: 0,
    transmissionRoughness: 1,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.1450093627985646,
      -1.3268421182511518,
      0.03174504419576352
    ),
    refractionZoom: 1,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(1, 0),
    emission: new Color(
      -0.13079969804376076,
      -0.20022862717042178,
      0.3665086640184809
    )
  },
  ruby: {
    matLibId: 'ruby',
    diffusionColor: new Color(
      0.13527317192686325,
      -0.4353897972500198,
      -0.015510304034886513
    ),
    diffusionRoughness: 5.212,
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 2.109,
    reflectionColor: new Color(
      0.9909863736569621,
      0.9910740570150627,
      0.9910740570150756
    ),
    transmissionAmount: 1,
    transmissionRoughness: 3.467,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.6111630136682986,
      0.03990255559685732,
      0.06825369207612475
    ),
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.9412915851271997, 0),
    refractionZoom: 0.239
  },
  glass: {
    matLibId: 'glass',
    diffusionColor: new Color(
      0.860031198907402,
      0.8308299100130593,
      0.9341080762664099
    ),
    diffusionRoughness: 7.636,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionRoughness: 2.4,
    reflectionColor: new Color(
      0.9582669757452716,
      0.9583517640618722,
      0.9583517640618793
    ),
    transmissionAmount: 1,
    transmissionRoughness: 2.206,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.6041211994760433,
      0.6041746526585307,
      0.6041746526585335
    ),
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.960861056751468, 0),
    refractionZoom: 0.191
  },
  manaVialGlass: {
    matLibId: 'manaVialGlass',
    diffusionColor: new Color(
      1.0185920557792196,
      1.0186821817126952,
      1.0186821817127045
    ),
    diffusionRoughness: 6.764,
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 2.012,
    reflectionColor: new Color(
      0.9284095820476579,
      0.9284917285554103,
      0.9284917285554507
    ),
    transmissionAmount: 0,
    transmissionRoughness: 1,
    transmissionInterpolation: false,
    transmissionColor: new Color(
      0.12414951210886699,
      0.12416049696840788,
      0.12416049696841873
    ),
    refractionZoom: 0,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.24657534246575347,
      4.996003610813204e-16
    ),
    useTransparency: true
  },
  purplePlastic: {
    matLibId: 'purplePlastic',
    diffusionColor: new Color(
      0.28322295897874433,
      0.10880812426426203,
      0.4576879133332237
    ),
    diffusionRoughness: 6.473,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionRoughness: 3.37,
    reflectionColor: new Color(
      0.9790990802316772,
      0.9791857117914625,
      0.9791857117914632
    ),
    transmissionAmount: 0.106,
    transmissionRoughness: 4.824,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.3634272329673199,
      0.22271889396567934,
      1.7665944824583935
    ),
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.2759295499021538, 0),
    refractionZoom: 0.045
  },
  stone: {
    matLibId: 'stone',
    diffusionColor: new Color(
      0.25649118224143486,
      0.32315763513989015,
      0.3567855786890411
    ),
    diffusionRoughness: 6.085,
    diffusionInterpolation: false,
    reflectionInterpolation: true,
    reflectionRoughness: 5.503,
    reflectionColor: new Color(
      0.21842128184390247,
      0.21844060795370593,
      0.2184406079537127
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(
      0.9232707964095136,
      0.9232910720845217,
      0.923291072084533
    ),
    transmissionRoughness: 8,
    transmissionInterpolation: false,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.8825831702544015,
      0.019569471624266588
    ),
    refractionZoom: 0.482
  },
  chrome: {
    matLibId: 'chrome',
    diffusionColor: new Color(
      0.7875290379877451,
      0.7875987192593507,
      0.7875987192593507
    ),
    diffusionRoughness: 1.915,
    diffusionInterpolation: true,
    reflectionInterpolation: true,
    reflectionRoughness: 4.63,
    reflectionColor: new Color(
      1.0068294017013115,
      0.9965856012583955,
      0.9965856012584128
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(
      0.8745098039215686,
      0.8745098039215686,
      0.8745098039215686
    ),
    transmissionRoughness: 4.048,
    transmissionInterpolation: false,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.02152641878669259,
      0.1761252446183973
    ),
    refractionZoom: 0.2
  },
  purpleMetal: {
    matLibId: 'purpleMetal',
    diffusionColor: new Color(
      0.36266709940971426,
      0.24584601448870436,
      0.5226980068009901
    ),
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 4.727,
    reflectionColor: new Color(
      0.38709445193490166,
      0.22661881034865033,
      0.9086100927033594
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(
      0.8745098039215686,
      0.8745098039215686,
      0.8745098039215686
    ),
    transmissionRoughness: 1,
    transmissionInterpolation: false,
    refractionZoom: 0.768,
    useMetallicDiffuse: true,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      -0.15459882583170315,
      0.7436399217221126
    ),
    diffusionRoughness: 2.303
  },
  gold: {
    matLibId: 'gold',
    diffusionColor: new Color(
      0.35021170398255097,
      0.09125369578308579,
      -0.39531907524774634
    ),
    diffusionInterpolation: true,
    reflectionInterpolation: true,
    reflectionRoughness: 4.824,
    reflectionColor: new Color(
      1.314143806724439,
      0.9748216537990014,
      0.694161422717343
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(1, 1, 1),
    transmissionRoughness: 0,
    transmissionInterpolation: false,
    refractionZoom: 0,
    useMetalShine: true,
    useMetallicDiffuse: true,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.0802348336594917,
      0.7436399217221188
    ),
    diffusionRoughness: 7.152
  },
  silver: {
    matLibId: 'silver',
    diffusionColor: new Color(
      0.23177707237065698,
      0.2317975802127107,
      0.23179758021272404
    ),
    diffusionInterpolation: true,
    reflectionInterpolation: true,
    reflectionRoughness: 4.533,
    reflectionColor: new Color(
      0.8508515353959979,
      0.8463484326771763,
      0.9956731569838572
    ),
    transmissionAmount: 0,
    transmissionColor: new Color(
      1.895576333678888,
      1.8956666785559935,
      1.8956666785560308
    ),
    transmissionRoughness: 1,
    transmissionInterpolation: false,
    refractionZoom: 0.142,
    useMetalShine: true,
    useMetallicDiffuse: true,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(
      0.9804305283757324,
      0.21526418786692592
    ),
    diffusionRoughness: 6.57
  },
  holographicCardFrameSilver: {
    matLibId: 'holographicCardFrameSilver',
    diffusionInterpolation: false,
    useMetallicDiffuse: true,
    diffusionColor: new Color('#42314b').multiplyScalar(0.6),
    diffusionRoughness: 5,
    transmissionInterpolation: true,
    transmissionColor: new Color('#02318b').multiplyScalar(0.4),
    transmissionRoughness: 6,
    reflectionInterpolation: true,
    reflectionColor: new Color('#02714b').multiplyScalar(0.2),
    reflectionRoughness: 4,
    transmissionAmount: 0.5,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.5, 0.25),
    refractionZoom: 0.9,
    side: DoubleSide,
    depthWrite: false,
    blendMode: 'screen',
    finalColorScale: new Color(2, 2, 2)
  },
  holographicCardFrameGold: {
    matLibId: 'holographicCardFrameGold',
    diffusionInterpolation: false,
    useMetallicDiffuse: true,
    diffusionColor: new Color('#4b2b1a').multiplyScalar(0.6),
    diffusionRoughness: 5,
    transmissionInterpolation: true,
    transmissionColor: new Color('#8b8300').multiplyScalar(0.4),
    transmissionRoughness: 6,
    reflectionInterpolation: true,
    reflectionColor: new Color('#714800').multiplyScalar(0.2),
    reflectionRoughness: 4,
    transmissionAmount: 0.5,
    reflectionStrengthPerpendicularVSHeadOn: new Vector2(0.5, 0.25),
    refractionZoom: 0.9,
    side: DoubleSide,
    depthWrite: false,
    blendMode: 'screen',
    finalColorScale: new Color(2, 2, 2)
  },
  Df: {
    matLibId: 'Df',
    diffusionColor: new Color(
      0.2602871266454217,
      0.5311171192273604,
      0.4942951497223205
    ),
    diffusionRoughness: 6.764,
    diffusionInterpolation: true,
    reflectionInterpolation: false,
    reflectionRoughness: 4.63,
    reflectionColor: new Color(
      0.2787547450184935,
      0.27877940948692065,
      0.27877940948693086
    ),
    transmissionAmount: 0,
    transmissionRoughness: 5.309,
    transmissionInterpolation: false,
    transmissionColor: new Color(
      0.18689714200562438,
      -0.3433796881357218,
      -0.34351566619205826
    ),
    refractionZoom: 0.859
  },
  Rfr: {
    matLibId: 'Rfr',
    diffusionColor: new Color(
      0.6457854084489745,
      0.64584254811783,
      0.6458425481178274
    ),
    diffusionRoughness: 6.958,
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 1.042,
    reflectionColor: new Color(
      1.0197452221079195,
      1.0195993038276587,
      1.0231258876989193
    ),
    transmissionAmount: 0.858,
    transmissionRoughness: 2.982,
    transmissionInterpolation: true,
    transmissionColor: new Color(
      0.38194282313656774,
      0.3819766177781783,
      0.38197661777817843
    ),
    refractionZoom: 0.191
  },
  DfRfr: {
    matLibId: 'DfRfr',
    diffusionColor: new Color(
      0.42559171125239326,
      0.3598598085913592,
      0.3395234643781692
    ),
    diffusionRoughness: 6.958,
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 0.655,
    reflectionColor: new Color(
      1.0207632892045473,
      1.0208536072506964,
      1.0208536072507022
    ),
    transmissionAmount: 0.227,
    transmissionRoughness: 3.855,
    transmissionInterpolation: false,
    transmissionColor: new Color(
      1.2726073386356314,
      -0.16734131290443707,
      -0.16771057403866532
    ),
    refractionZoom: 0.859
  },
  Rfl: {
    matLibId: 'Rfl',
    diffusionRoughness: 4.145,
    diffusionColor: new Color(
      0.3495755171317696,
      0.3496064478852702,
      0.34960644788527917
    ),
    diffusionInterpolation: false,
    reflectionInterpolation: false,
    reflectionRoughness: 2.012,
    reflectionColor: new Color(
      0.7813630974677297,
      0.801554548577569,
      1.0084439603929285
    ),
    transmissionAmount: 0,
    transmissionRoughness: 1,
    transmissionInterpolation: false,
    transmissionColor: new Color(
      0.18689714200562438,
      -0.3433796881357218,
      -0.34351566619205826
    ),
    refractionZoom: 0.215
  }
} as const

export const lightCacheMaterialParamsLibrary: {
  [K in keyof typeof __lightCacheMaterialParamsLibrary]: Partial<LightCacheMeshMaterialParameters>
} = __lightCacheMaterialParamsLibrary

export const lightCacheMaterialParamsLibraryKeys = Object.keys(
  lightCacheMaterialParamsLibrary
) as Array<keyof typeof lightCacheMaterialParamsLibrary>

export function __exportLightCacheMaterialParamsLibrary() {
  const exportObj: any = {}
  for (const materialName of lightCacheMaterialParamsLibraryKeys) {
    const exportMat: any = {}
    exportObj[materialName] = exportMat
    const mat = lightCacheMaterialParamsLibrary[materialName]
    Object.keys(mat).forEach((key: Extract<keyof typeof mat, string>) => {
      const item = mat[key]
      if (item instanceof Color) {
        exportMat[key] = `new Color(${item.r}, ${item.g}, ${item.b})`
        // } else if (item instanceof Vector3) {
        //   exportMat[key] = `new Vector3(${item.x}, ${item.y}, ${item.z})`
        // } else if (item instanceof Vector2) {
        //   exportMat[key] = `new Vector2(${item.x}, ${item.y})`
      } else if (typeof item === 'string') {
        exportMat[key] = `'${item}'`
      } else {
        exportMat[key] = item
      }
    })
  }
  const jsonString = JSON.stringify(exportObj, null, 2)
  const codeString = jsonString.replace(new RegExp('"', 'g'), '')
  console.log('==========================')
  console.log(codeString)
  copyTextToClipboard(codeString)
  console.log('==========================')
}

export const resetMaterialsRequest = new NiceBooleanParameter(
  'reset-materials',
  'Reset Materials',
  false,
  'graphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)

export const __previousResetMaterialsRequest = resetMaterialsRequest.value

resetMaterialsRequest.value = false

const __onMatParamsChangeHandlers: Array<
  (mp: LightCacheMeshMaterialParameters) => void
> = []

export function linkMaterialChangesToMeshes(root: Object3D) {
  listenForMatLibEditorChanges(matParams => {
    root.traverse(m => {
      if (m instanceof Mesh) {
        const mat = m.material
        if (
          mat instanceof LightCacheMeshMaterial &&
          mat.isVariantOf(matParams)
        ) {
          m.material = mat.variant(matParams)
        }
      }
    })
  })
}

export function listenForMatLibEditorChanges(
  listener: (mp: LightCacheMeshMaterialParameters) => void
) {
  __onMatParamsChangeHandlers.push(listener)
}

export function __matParamsChangeHandler(matParams: any) {
  for (const onMatParamsChange of __onMatParamsChangeHandlers) {
    onMatParamsChange(matParams)
  }
}
