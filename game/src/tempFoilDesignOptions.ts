import { i18n } from '@opensky/language-manager'
import { isDevMode } from '@opensky/shared/devMode'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { copyTextToClipboard } from '@opensky/shared/utils/copyToClipboard'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import FoilKit from './foils/FoilKit'
import { FoilKitSettings } from './foils/FoilKitSettings'
import {
  FoilContextType,
  foilContextTypeStrings,
  FoilType,
  foilTypeStrings
} from './foils/FoilKitTypeHelpers'
import { assignProps } from './utils/jsUtils'
import NiceMethod from './utils/NiceMethod'
import { capitalize, replaceAll } from './utils/stringUtils'

const toggleFoils = new NiceBooleanParameter(
  'toggle-foil-effects',
  () => i18n.t('common:options.graphicsOptions.showFoilEffects'),
  true,
  'userGraphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -5
)

const defaultSettingsStr =
  '{"dataType":"Map","value":[["gold",{"dataType":"Map","value":[["inspecting",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.02,"foilRGBSplit":1.2211,"metalColorStrength":1,"foilOnArtFGOnly":0.1457,"foilOnArtBGOnly":0.3116,"foilOnFrameOnly":0.2211,"foilWaveSpeed":0,"tiltShineSensitivity":3.5719}}],["hand",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.5125,"foilRGBSplit":1.3417,"metalColorStrength":1,"foilOnArtFGOnly":0.1457,"foilOnArtBGOnly":0.2663,"foilOnFrameOnly":0.1658,"foilWaveSpeed":0.2111,"tiltShineSensitivity":0.1}}],["token",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.1086,"foilRGBSplit":1.1608,"metalColorStrength":0,"foilOnArtFGOnly":0.0704,"foilOnArtBGOnly":0.2462,"foilOnFrameOnly":0,"foilWaveSpeed":0.1608,"tiltShineSensitivity":5}}],["default",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.2416,"foilRGBSplit":1.5075,"metalColorStrength":0.7437,"foilOnArtFGOnly":0.1106,"foilOnArtBGOnly":0.2111,"foilOnFrameOnly":0.1256,"foilWaveSpeed":0.0804,"tiltShineSensitivity":5}}],["none",{"dataType":"FoilKit","value":{"active":false,"foilBandWavelength":0.8375,"foilRGBSplit":2.3367,"metalColorStrength":1.6181,"foilOnArtFGOnly":0.8643,"foilOnArtBGOnly":0.8844,"foilOnFrameOnly":0.8643,"foilWaveSpeed":0.8844,"tiltShineSensitivity":3.8181}}],["dragging",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.5125,"foilRGBSplit":1.6432,"metalColorStrength":1,"foilOnArtFGOnly":0.1457,"foilOnArtBGOnly":0.2663,"foilOnFrameOnly":0.1658,"foilWaveSpeed":0,"tiltShineSensitivity":0.297}}]]}],["silver",{"dataType":"Map","value":[["hand",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.5716,"foilRGBSplit":0.8744,"metalColorStrength":1,"foilOnArtFGOnly":0.1457,"foilOnArtBGOnly":0.2513,"foilOnFrameOnly":0.1658,"foilWaveSpeed":0.2513,"tiltShineSensitivity":0.1}}],["inspecting",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.02,"foilRGBSplit":0.7839,"metalColorStrength":1,"foilOnArtFGOnly":0.1457,"foilOnArtBGOnly":0.2864,"foilOnFrameOnly":0.2261,"foilWaveSpeed":0,"tiltShineSensitivity":3.8181}}],["token",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.281,"foilRGBSplit":0.6935,"metalColorStrength":0,"foilOnArtFGOnly":0.1055,"foilOnArtBGOnly":0.2864,"foilOnFrameOnly":0,"foilWaveSpeed":0.201,"tiltShineSensitivity":0.1}}],["default",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.2662,"foilRGBSplit":0.9196,"metalColorStrength":0.7035,"foilOnArtFGOnly":0.1106,"foilOnArtBGOnly":0.2111,"foilOnFrameOnly":0.1256,"foilWaveSpeed":0.0653,"tiltShineSensitivity":5}}],["none",{"dataType":"FoilKit","value":{"active":false,"foilBandWavelength":1,"foilRGBSplit":1,"metalColorStrength":1,"foilOnArtFGOnly":1,"foilOnArtBGOnly":1,"foilOnFrameOnly":1,"foilWaveSpeed":1,"tiltShineSensitivity":1}}],["dragging",{"dataType":"FoilKit","value":{"active":true,"foilBandWavelength":0.5371,"foilRGBSplit":0.9196,"metalColorStrength":1,"foilOnArtFGOnly":0.1457,"foilOnArtBGOnly":0.2663,"foilOnFrameOnly":0.1658,"foilWaveSpeed":0,"tiltShineSensitivity":0.297}}]]}]]}'

let defaultSettings: any

const foilCat = isDevMode() ? 'foils' : 'never'

let foilKits = new Map<FoilType, Map<FoilContextType, FoilKit>>()

function setupNiceFoilNumber(
  description: string,
  defVal: number,
  minVal: number,
  maxVal: number,
  labelMaker = (v: number) => v.toFixed(2),
  stepSize = 0.0001,
  persistant = false
) {
  const name = replaceAll(description.toLowerCase(), ' ', '-')
  return new NiceFloatParameter(
    name,
    description.split(' ').map(capitalize).join(' '),
    defaultSettings && name in defaultSettings ? defaultSettings[name] : defVal,
    minVal,
    maxVal,
    distributions.linear,
    labelMaker,
    foilCat,
    RESET_USER_SETTINGS_TO_DEFAULTS,
    stepSize,
    undefined,
    persistant
  )
}

const _workingFoilKitSettings = new FoilKitSettings()
let _currentFoilKit = new FoilKit()

function setCurrentFoilKit(value: FoilKit) {
  _currentFoilKit = value
  getCurrentFoilKit()
  assignProps(_workingFoilKitSettings, value.settings)
}

function getFoilTypeByFloat(v: number) {
  return foilTypeStrings[Math.round(v * (foilTypeStrings.length - 1))]
}
function getFoilContextTypeByFloat(v: number) {
  return foilContextTypeStrings[
    Math.round(v * (foilContextTypeStrings.length - 1))
  ]
}
const foilType = setupNiceFoilNumber(
  'type',
  0,
  0,
  1,
  getFoilTypeByFloat,
  1 / (foilTypeStrings.length - 1),
  true
)

const foilContext = setupNiceFoilNumber(
  'context',
  0,
  0,
  1,
  getFoilContextTypeByFloat,
  1 / (foilContextTypeStrings.length - 1),
  true
)

let uiInited = false
function getCurrentFoilKit() {
  if (!uiInited) {
    uiInited = true

    const active = new NiceBooleanParameter(
      `foil-toggle`,
      `Use Foil`,
      false,
      foilCat,
      undefined,
      RESET_USER_SETTINGS_TO_DEFAULTS,
      undefined,
      false
    )
    active.listen(v => {
      _workingFoilKitSettings.active = v
      _currentFoilKit!.settings.active = v
    }, false)
    listenToProperty(
      _workingFoilKitSettings,
      'active',
      v => (active.value = v),
      false
    )

    const foilBandWavelength = setupNiceFoilNumber(
      'band wavelength',
      0.5,
      0.02,
      1
    )
    foilBandWavelength.listen(v => {
      _currentFoilKit!.settings.foilBandWavelength = v
      _workingFoilKitSettings.foilBandWavelength = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'foilBandWavelength',
      v => (foilBandWavelength.value = v)
    )

    const foilRGBSplit = setupNiceFoilNumber(`prismatic refraction`, 1, 0, 3)

    foilRGBSplit.listen(v => {
      _workingFoilKitSettings.foilRGBSplit = v
      _currentFoilKit!.settings.foilRGBSplit = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'foilRGBSplit',
      v => (foilRGBSplit.value = v)
    )

    const metalColorStrength = setupNiceFoilNumber(
      `metal color strength`,
      1,
      0,
      2
    )

    metalColorStrength.listen(v => {
      _workingFoilKitSettings.metalColorStrength = v
      _currentFoilKit!.settings.metalColorStrength = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'metalColorStrength',
      v => (metalColorStrength.value = v)
    )

    const foilOnArtFGOnly = setupNiceFoilNumber(
      `foil on art FG only`,
      0.5,
      0,
      1
    )
    foilOnArtFGOnly.listen(v => {
      _workingFoilKitSettings.foilOnArtFGOnly = v
      _currentFoilKit!.settings.foilOnArtFGOnly = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'foilOnArtFGOnly',
      v => (foilOnArtFGOnly.value = v)
    )

    const foilOnArtBGOnly = setupNiceFoilNumber(
      `foil on art BG only`,
      0.5,
      0,
      1
    )
    foilOnArtBGOnly.listen(v => {
      _workingFoilKitSettings.foilOnArtBGOnly = v
      _currentFoilKit!.settings.foilOnArtBGOnly = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'foilOnArtBGOnly',
      v => (foilOnArtBGOnly.value = v)
    )

    const foilOnFrameOnly = setupNiceFoilNumber(`foil on frame only`, 0.5, 0, 1)
    foilOnFrameOnly.listen(v => {
      _workingFoilKitSettings.foilOnFrameOnly = v
      _currentFoilKit!.settings.foilOnFrameOnly = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'foilOnFrameOnly',
      v => (foilOnFrameOnly.value = v)
    )

    const foilWaveSpeed = setupNiceFoilNumber(`foil wave speed`, 0.5, 0, 1)

    foilWaveSpeed.listen(v => {
      _workingFoilKitSettings.foilWaveSpeed = v
      _currentFoilKit!.settings.foilWaveSpeed = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'foilWaveSpeed',
      v => (foilWaveSpeed.value = v)
    )

    const tiltShineSensitivity = setupNiceFoilNumber(
      'tilt shine sensitivity',
      0.5,
      0.1,
      5
    )
    tiltShineSensitivity.listen(v => {
      _currentFoilKit!.settings.tiltShineSensitivity = v
      _workingFoilKitSettings.tiltShineSensitivity = v
    }, true)
    listenToProperty(
      _workingFoilKitSettings,
      'tiltShineSensitivity',
      v => (tiltShineSensitivity.value = v)
    )

    foilType.listen(v => {
      setCurrentFoilKit(
        getFoilKit(
          getFoilTypeByFloat(v),
          getFoilContextTypeByFloat(foilContext.value)
        )
      )
    })

    foilContext.listen(v => {
      setCurrentFoilKit(
        getFoilKit(
          getFoilTypeByFloat(foilType.value),
          getFoilContextTypeByFloat(v)
        )
      )
    })
  }

  return _currentFoilKit
}

function replacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()) // or with spread: value: [...value]
    }
  } else if (value instanceof FoilKit) {
    return {
      dataType: 'FoilKit',
      value: value.settings // or with spread: value: [...value]
    }
  } else {
    return value
  }
}
function reviver(key: string, value: any) {
  if (typeof value === 'object' && value !== null) {
    switch (value.dataType) {
      case 'Map':
        return new Map(value.value)
      case 'FoilKit':
        return new FoilKit(value.value as FoilKitSettings)
    }
  }
  return value
}

export function getFoilKit(foilType: FoilType, context: FoilContextType) {
  if (!foilKits.has(foilType)) {
    foilKits.set(foilType, new Map())
  }
  const byContext = foilKits.get(foilType)!
  if (!byContext.has(context)) {
    byContext.set(context, new FoilKit())
  }
  return byContext.get(context)!
}
if (isDevMode()) {
  if (RESET_USER_SETTINGS_TO_DEFAULTS) {
    loadSettings(defaultSettingsStr || '{}')
  } else {
    loadSettings(localStorage.getItem('foils6') || defaultSettingsStr)
  }
  getCurrentFoilKit()
  setInterval(() => {
    localStorage.setItem('foils6', JSON.stringify(foilKits, replacer))
  }, 1000)
} else {
  loadSettings(defaultSettingsStr || '{}')
}

const _clipboard = new FoilKitSettings()
new NiceMethod(
  'Copy (clipboard)',
  () => {
    assignProps(_clipboard, _workingFoilKitSettings)
    const dataStr = JSON.stringify(_workingFoilKitSettings)
    copyTextToClipboard(dataStr)
  },
  'COPY PRESET',
  foilCat
)

new NiceMethod(
  'Paste',
  () => {
    const dataStr =
      window.prompt('Paste Settings JSON:', JSON.stringify(_clipboard)) || '{}'
    try {
      const data = JSON.parse(dataStr)
      assignProps(_workingFoilKitSettings, data)
    } catch (e) {
      console.error(e.message)
    }
  },
  'PASTE PRESET',
  foilCat
)

new NiceMethod(
  'Save (clipboard)',
  () => {
    const dataStr = JSON.stringify(foilKits, replacer)
    console.log(dataStr)
    copyTextToClipboard(dataStr)
  },
  'EXPORT ALL PRESETS',
  foilCat
)

function loadSettings(dataStr: string) {
  foilKits = JSON.parse(dataStr, reviver)
  toggleFoils.listen(state => {
    foilKits.forEach(v => {
      v.forEach(v2 => {
        v2.settings.active = v2.settings.active && state
      })
    })
  })
  getCurrentFoilKit()
  setCurrentFoilKit(
    getFoilKit(
      getFoilTypeByFloat(foilType.value),
      getFoilContextTypeByFloat(foilContext.value)
    )
  )
}

new NiceMethod(
  'Load',
  () => {
    const dataStr = window.prompt('Paste Settings JSON:', '{}') || '{}'
    try {
      loadSettings(dataStr)
    } catch (e) {
      console.error(e.message)
    }
  },
  'IMPORT ALL PRESETS',
  foilCat
)

new NiceMethod(
  'Reset',
  () => {
    const loadedFoilKits = JSON.parse(defaultSettingsStr, reviver) as Map<
      FoilType,
      Map<FoilContextType, FoilKit>
    >
    loadedFoilKits.forEach((map1, key1) => {
      map1.forEach((foilKit, key2) => {
        assignProps(foilKits.get(key1)!.get(key2)!.settings, foilKit.settings)
      })
    })
    assignProps(_workingFoilKitSettings, _currentFoilKit.settings)
  },
  'RESET TO DEFAULTS',
  foilCat
)
