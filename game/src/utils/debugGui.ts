import { i18n, translate } from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import device from '@opensky/shared/device'
import { isDevMode } from '@opensky/shared/devMode'
import { delayPromise } from '@opensky/shared/utils/async'
import { NiceCategory } from '@opensky/shared/utils/NiceElement'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Entity } from 'gg'
import { Color, MeshLambertMaterial, Object3D } from 'three'

import Gradient from '~/colors/Gradient'
import { Components } from '~/components'
import IsAnimatingComponent, {
  IsAnimating
} from '~/components/IsAnimatingComponent'
import { USE_WORKER } from '~/constants'
import {
  SkyTimerController,
  skyTimerControllerWrapper
} from '~/controllers/skyTimerController'
import { Debuggable, debuggables } from '~/debug/debugRegistry'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import SkyTimerTimelineHelper from '~/helpers/SkyTimerTimelineHelper'
import { getTimeMarker } from '~/helpers/timeMarker'
import Object2D from '~/meshes/Object2D'
import RenderDebugPoints from '~/points/RenderDebugPoints'
import queryParams from '~/queryParams'
import renderer from '~/renderer'
import Button from '~/scenes/ui/components/Button'
import TimeMarkerVisualizer from '~/scenes/ui/components/TimeMarkerVisualizer'
import ErrorDialogContainer from '~/scenes/ui/containers/errorDialog'
import { CompleteStatusNameLookup } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import { TextSegment } from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { buildDebugMenu, testLibrary } from '~/tests'
import { debugGuiState, interceptLogs } from '~/userSettings'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import {
  getCachedWebGLCommandColors,
  toggleWebGLCommandTracer,
  webGLCommandTracerInterval,
  webGLCommandTracerPointSize,
  webGLCommandTracerWrapWidth
} from '~/webGLDebugOptions'

import { COLOR_BLACK, COLOR_WHITE } from '../colors/colorLibrary'
import { createCategoricalNiceModal } from './createNiceModal'
import { decorateMethodAfter, decorateMethodBefore } from './jsUtils'
import { changeUrlParamAndReload } from './location'
import NiceMethod from './NiceMethod'
import { stateUtils } from './stateUtils'
import { padLeadingZeros, stringIsNumberRepr } from './stringUtils'
import { TrackableCollection } from './TrackableCollection'
import { createCloseDebugOverlay, createDebugButton } from './ui'

if (import.meta.hot) {
  import.meta.hot.accept('./containers/errorDialog', () => {
    console.warn(
      'ErrorDialogContainer updated, not forcing a refresh via debugGui.ts'
    )
  })
}
export const specialObjectName = 'magic stone box with lights and grass_1'
const pattern = [
  'rock',
  'rock',
  'rock',
  'rock',
  'field',
  'rock',
  'rock',
  'rock',
  'rock',
  'field',
  'rock',
  'field',
  'rock'
] as const

let accumulator: Array<(typeof pattern)[number]> = []
export function onMagicStoneClicked(obj: Object3D) {
  const ident = obj.name === specialObjectName ? 'rock' : 'field'
  const idx = accumulator.length // the next item, this isn't an off-by-one
  if (ident !== pattern[idx]) {
    accumulator = []
  } else {
    accumulator.push(ident)
  }
  if (accumulator.length === 9) {
    debugGuiState.value = true
  } else if (accumulator.length === pattern.length) {
    debuggables.setActiveLevel(1)
    accumulator = []
  }
}
if (isDevMode()) {
  setTimeout(() => {
    debuggables.setActiveLevel(1)
  }, 1000)
}

const debugCodeHideError = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight'
]
const debugCodeLvl1 = 'iddqd'
const debugCodeLvl2 = 'bbq'
const debugCode = debugCodeLvl1 + debugCodeLvl2
let debugIndex = 0
let hideErrorIndex = 0
window.addEventListener('keydown', ev => {
  if (ev.key === debugCode[debugIndex]) {
    debugIndex++
  } else {
    debugIndex = 0
  }
  if (debugIndex === debugCodeLvl1.length) {
    debugGuiState.value = true
    debuggables.setActiveLevel(0)
  } else if (debugIndex === debugCode.length) {
    debuggables.setActiveLevel(1)
  }
  if (ev.key === debugCodeHideError[hideErrorIndex]) {
    hideErrorIndex++
  } else {
    hideErrorIndex = 0
  }
  if (hideErrorIndex === debugCodeHideError.length) {
    ErrorDialogContainer.dismissAll()
  }
})

let debugMaterial: MeshLambertMaterial | undefined
const debugEmissiveColor = { r: 1, g: 0, b: 0.5 }
const originalEmissiveColor = { r: 0, g: 0, b: 0 }
const colorSuperWhite = { r: 3, g: 2.5, b: 1.6 }
export function registerDebugMaterial(mat: MeshLambertMaterial) {
  if (mat.emissive) {
    debugMaterial = mat
    originalEmissiveColor.r = mat.emissive.r
    originalEmissiveColor.g = mat.emissive.g
    originalEmissiveColor.b = mat.emissive.b
  } else {
    console.warn("Could not get reference to debug material's emissive color")
  }
  setState(debugGuiState.value)
}

let _state = false

async function changeDebugGui(state: boolean) {
  await onGlobalUiAccessReady()
  if (
    globalAccess.uiSkip ||
    (!globalAccess.ui!.hasContainer('debug') && !state)
  ) {
    return
  }
  const dc = globalAccess.ui!.getContainer('debug')
  await dc.ready
  if (state) {
    dc.fadeIn()
  } else {
    dc.fadeOut()
  }
  if (debugMaterial) {
    simpleTweener.to({
      description: 'change debug mat',
      target: debugMaterial.emissive,
      propertyGoals: state ? debugEmissiveColor : originalEmissiveColor,
      duration: 700
    })
  }
}

debugGuiState.listen(setState)

function setState(state: boolean) {
  if (_state === state) {
    return
  }
  _state = state
  if (debugMaterial) {
    simpleTweener.to({
      description: 'set state',
      target: debugMaterial.emissive,
      propertyGoals: colorSuperWhite,
      duration: 500,
      onComplete: () => setTimeout(() => changeDebugGui(state), 0)
    })
  } else {
    changeDebugGui(state)
  }
}

buildDebugMenu('tests', testLibrary)

debuggables.register(
  'foils',
  new Debuggable(async () => {
    const { modal, updateModalScroller } = await createCategoricalNiceModal(
      'foils',
      'Foil Settings'
    )
    modal.mesh.matrix.anchor = ReadonlyPin.BottomRight
    modal.mesh.matrix.offset = ReadonlyPin.BottomRight
    return [modal.mesh, updateModalScroller]
  })
)

debuggables.register(
  'secret options',
  new Debuggable(async () => {
    const overlay = createCloseDebugOverlay(true)
    const { modal, updateModalScroller } =
      await createCategoricalNiceModal('secret')
    return [overlay, modal.mesh, updateModalScroller]
  }),
  1
)

debuggables.register(
  'graphics',
  new Debuggable(async () => {
    const overlay = createCloseDebugOverlay(true)
    const { modal, updateModalScroller } =
      await createCategoricalNiceModal('graphics')
    return [overlay, modal.mesh, updateModalScroller]
  }),
  0
)

let __webGLCmdTraceLegend: UITextMesh | undefined
let __webGLCmdTracePoints: RenderDebugPoints | undefined

function __getWebGLCmdTracePoints() {
  if (!__webGLCmdTracePoints) {
    const ctx = renderer.getContext()
    const testPoints = new RenderDebugPoints()
    testPoints.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    decorateMethodAfter(renderer, 'render', () => {
      if (testPoints.isTakingData) {
        testPoints.markNewRender()
      }
    })
    for (const methodName in ctx) {
      // @ts-ignore
      if (typeof ctx[methodName] === 'function') {
        decorateMethodAfter(ctx, methodName, () => {
          if (testPoints.isTakingData) {
            testPoints.markNewCommand(methodName)
          }
        })
      }
    }
    // TODO update this object vvv
    // testPoints.matrix.setConstraintsPosition(ReadonlyPin.TopLeft.cloneOffset(10, 60))
    webGLCommandTracerInterval.listen(v => (testPoints.interval = v))
    webGLCommandTracerPointSize.listen(v => (testPoints.pointSize = v))
    webGLCommandTracerWrapWidth.listen(v => (testPoints.wrapWidth = v))
    __webGLCmdTracePoints = testPoints

    const legend = new UITextMesh(
      [
        {
          text: 'test\ntest\ntest',
          color: new Gradient({
            topLeft: COLOR_BLACK,
            topRight: COLOR_WHITE,
            bottomLeft: COLOR_BLACK,
            bottomRight: COLOR_WHITE
          })
        }
      ],
      textOptions.webGLCommandLegend
    )
    legend.matrix.setConstraintsPosition(
      ReadonlyPin.BottomRight.cloneOffset(-5, -5)
    )
    __webGLCmdTraceLegend = legend
    listenToProperty(testPoints, 'commandNames', (strs: string[]) => {
      legend.text = strs.map<TextSegment>(text => {
        const cols = getCachedWebGLCommandColors(text)
        const gradient = new Gradient({
          topLeft: cols[0],
          topRight: cols[1],
          bottomLeft: cols[2],
          bottomRight: cols[3]
        })
        return {
          text: text + '\n',
          color: gradient
        }
      })
    })
  }
  return __webGLCmdTracePoints
}

toggleWebGLCommandTracer.listen(async v => {
  if (!__webGLCmdTracePoints && !v) {
    return
  }
  await onGlobalUiAccessReady()
  const debugUI = globalAccess.ui!.getContainer('debug')
  await debugUI.ready
  if (__webGLCmdTracePoints && !v) {
    debugUI.remove(__webGLCmdTracePoints)
    debugUI.remove(__webGLCmdTraceLegend!)
  } else if (v) {
    debugUI.add(__getWebGLCmdTracePoints())
    debugUI.add(__webGLCmdTraceLegend!)
  }
})

debuggables.register(
  'graphics/webGL',
  new Debuggable(async () => {
    const overlay = createCloseDebugOverlay(true)
    const { modal, updateModalScroller } = await createCategoricalNiceModal(
      'webGL',
      'bottom'
    )
    return [overlay, modal.mesh, updateModalScroller]
  })
)

debuggables.register(
  'options',
  new Debuggable(async () => {
    const overlay = createCloseDebugOverlay(true)
    const { modal, updateModalScroller } = await createCategoricalNiceModal(
      'options',
      i18n.t('common:options.options')
    )
    return [overlay, modal.mesh, updateModalScroller]
  })
)

const graphicalOptions: Array<[string, NiceCategory]> = [
  ['manaVial', 'manaVialOptions'],
  ['clouds', 'raycastCloudOptions']
]
for (const cat of graphicalOptions) {
  debuggables.register(
    'graphics/' + cat[0],
    new Debuggable(async () => {
      const overlay = createCloseDebugOverlay(true)
      overlay.matrix.opacity = 0
      const { modal, updateModalScroller } = await createCategoricalNiceModal(
        cat[1]
      )
      return [overlay, modal.mesh, updateModalScroller]
    }),
    1
  )
}

debuggables.register(
  'graphics/triggers',
  new Debuggable(async () => {
    while (!globalAccess.ui) {
      await delayPromise(100)
    }
    const { modal, updateModalScroller } = await createCategoricalNiceModal(
      'triggers',
      'bottom'
    )
    return [modal.mesh, updateModalScroller]
  }),
  1
)

function genericButtonList(names: string[], jobs: Array<() => void>) {
  return new Debuggable(() => {
    let cursor: Button | undefined
    const root = new Object2D(false)
    root.matrix.setConstraintsPosition(ReadonlyPin.TopLeft.cloneOffset(0, 70))
    for (let i = 0; i < names.length; i++) {
      cursor = createDebugButton(
        cursor ? cursor.mesh : root,
        names[i],
        jobs[i],
        cursor ? 'vert' : 'first'
      )
    }
    return [root]
  })
}

const modeNames = [...Object.keys(GameMode)]
const modeJobs = modeNames.map(mode => () => {
  changeUrlParamAndReload('mode', mode)
})

const testGameModes = genericButtonList(modeNames, modeJobs)

debuggables.register('modes', testGameModes, 1)

const stateUtilNames = stateUtils.map(c => c.name)
const stateUtilJobs = stateUtils.map(c => c.job)
debuggables.register(
  'state',
  genericButtonList(stateUtilNames, stateUtilJobs),
  1
)

debuggables.register(
  'info',
  new Debuggable(() => {
    const overlay = createCloseDebugOverlay(true)
    const txt = new UITextMesh(
      [
        'is IOS: ' + device.isIOS,
        'is IPadOS: ' + device.isIpadOS,
        'using webworker: ' + USE_WORKER,
        // eslint-disable-next-line deprecation/deprecation
        navigator.platform,
        // eslint-disable-next-line deprecation/deprecation
        navigator.appVersion
      ].join('\n'),
      {
        ...textOptions.debugText,
        width: window.innerWidth - 20,
        align: 'left',
        vAlign: 'top',
        size: textOptions.debugText.size * 0.66
      }
    )
    txt.matrix.setConstraints(
      undefined,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(10, 120)
    )
    // applyPositionLayoutConstraint(txt, ReadonlyPin.TopLeft)
    return [overlay, txt]
  })
)

const __consoleHistoryMax = 8000
const __consoleHistory: string[] = []
const __visualConsoleHistoryMax = 40
const __visualConsoleHistory: TextSegment[] = []

let __consoleLogIntervalId: NodeJS.Timeout | undefined

const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

interceptLogs.listen(value => {
  if (value) {
    function addConsoleHistory(ts: TextSegment) {
      if (__consoleHistory.length >= __consoleHistoryMax) {
        __consoleHistory.shift()
      }
      if (__visualConsoleHistory.length >= __visualConsoleHistoryMax) {
        __visualConsoleHistory.shift()
      }
      __consoleHistory.push(ts.text)
      __visualConsoleHistory.push(ts)
    }

    console.log = Function.prototype.bind.call(console.log, console)
    decorateMethodBefore(console, 'log', (...args) => {
      addConsoleHistory({
        text: args.join(' ') + '\n',
        color: COLOR_WHITE
      })
    })

    const COLOR_YELLOW = new Color(1, 1, 0)
    decorateMethodBefore(console, 'warn', (...args) => {
      addConsoleHistory({
        text: args.join(' ') + '\n',
        color: COLOR_YELLOW
      })
    })

    const COLOR_RED = new Color(1, 0, 0)
    decorateMethodBefore(console, 'error', (...args) => {
      addConsoleHistory({
        text: args.join(' ') + '\n',
        color: COLOR_RED
      })
    })

    debuggables.register(
      'info/console',
      new Debuggable(
        () => {
          const overlay = createCloseDebugOverlay(true)
          const txt = new UITextMesh(__visualConsoleHistory, {
            ...textOptions.debugText,
            width: window.innerWidth - 20,
            align: 'left',
            vAlign: 'bottom',
            size: textOptions.debugText.size * 0.66
          })
          __consoleLogIntervalId = setInterval(() => {
            txt.text = __visualConsoleHistory
          }, 200)
          txt.matrix.setConstraints(
            ReadonlyPin.FullSize,
            ReadonlyPin.TopLeft,
            ReadonlyPin.BottomLeft.cloneOffset(0, -10)
          )
          return [overlay, txt]
        },
        () => {
          if (__consoleLogIntervalId !== undefined) {
            clearInterval(__consoleLogIntervalId)
            __consoleLogIntervalId = undefined
          }
        }
      )
    )
  } else if (__consoleLogIntervalId !== undefined) {
    clearInterval(__consoleLogIntervalId)
    __consoleLogIntervalId = undefined
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  }
})

const __colorAnimOld = new Color(0.5, 0.5, 0.5)
const __colorAnimCurrent = new Color(1, 1, 1)
let __animText: UITextMesh | undefined
function __getAnimText(): UITextMesh {
  if (!__animText) {
    __animText = new UITextMesh(
      [
        {
          text: 'old',
          color: __colorAnimOld
        },
        {
          text: 'current',
          color: __colorAnimCurrent
        }
      ],
      {
        ...textOptions.debugTextContrast,
        width: window.innerWidth - 20,
        align: 'left',
        vAlign: 'bottom',
        size: textOptions.debugText.size * 0.66
      }
    )
    __animText.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.BottomLeft.cloneOffset(0, -10)
    )
  }
  return __animText!
}
const __animSummaries = new Map<IsAnimating, string>()
let __animCounter = 0
const __currentAnims = new TrackableCollection<IsAnimating>('currentAnims')
const __oldAnims = new TrackableCollection<IsAnimating>('newAnims')
function __onAnimStart(ent: Entity<Components>) {
  let desc = `${padLeadingZeros(__animCounter, 3)}: (${ent.id})  `
  if (ent.has('cardInstance')) {
    const card = ent.get('cardInstance')
    const name = stringIsNumberRepr(card.base)
      ? translate.card.name(card.base)
      : card.base

    desc += name + ' -> '
  }
  const animComp = ent.get('isAnimating')!
  desc += animComp.description
  animComp.onComplete((ent, status) => {
    const newDesc = `${__animSummaries.get(animComp)!} (${
      CompleteStatusNameLookup[status]
    })`
    __animSummaries.set(animComp, newDesc)
    __currentAnims.remove(animComp)
    __oldAnims.add(animComp)
    __updateAnimText()
    setTimeout(() => {
      __oldAnims.remove(animComp)
      __updateAnimText()
    }, 20000)
  })
  __animCounter++
  __animSummaries.set(animComp, desc)
  __currentAnims.add(animComp)
  __updateAnimText()
}

function __updateAnimText() {
  const summaries: TextSegment[] =
    __oldAnims.items.length > 0
      ? __oldAnims.items.map(animComp => {
          return {
            text: __animSummaries.get(animComp)! + '\n',
            color: __colorAnimOld
          }
        })
      : [
          {
            text: 'no old anims                        \n',
            color: __colorAnimOld
          }
        ]
  if (__currentAnims.items.length > 0) {
    __currentAnims.items.forEach(animComp => {
      summaries.push({
        text: __animSummaries.get(animComp)! + '\n',
        color: __colorAnimCurrent
      })
    })
  } else {
    summaries.push({
      text: 'no current anims                           \n',
      color: __colorAnimCurrent
    })
  }
  __getAnimText().text = summaries
}
debuggables.register(
  'info/anims',
  new Debuggable(
    () => {
      IsAnimatingComponent.entities.listenForAdd(__onAnimStart)
      return [__getAnimText()]
    },
    () => {
      IsAnimatingComponent.entities.stopListeningForAdd(__onAnimStart)
    }
  )
)

let __skyTimerHelper: SkyTimerTimelineHelper | undefined
function __onSkyTimerTimeChange(t: number) {
  if (__skyTimerHelper) {
    __skyTimerHelper.timeInDays = t
  }
}
function __onSkyTimerTurnCounterChange(t: number) {
  if (__skyTimerHelper) {
    __skyTimerHelper.turnCounter = t
  }
}
function onSkyTimerController(c: SkyTimerController | undefined) {
  if (c) {
    if (__skyTimerHelper) {
      listenToProperty(c, 'daysGoneBy', __onSkyTimerTimeChange)
      listenToProperty(c, 'targetDaysGoneBy', __onSkyTimerTurnCounterChange)
      c.listenToTimeSyncs(
        __skyTimerHelper.addTimeSync,
        __skyTimerHelper.removeTimeSync
      )
    } else {
      stopListeningToProperty(c, 'daysGoneBy', __onSkyTimerTimeChange)
      stopListeningToProperty(
        c,
        'targetDaysGoneBy',
        __onSkyTimerTurnCounterChange
      )
    }
  }
}
debuggables.register(
  'info/skytimer',
  new Debuggable(
    () => {
      const txt = new UITextMesh('sky timer\n2\n3', {
        ...textOptions.debugText,
        width: window.innerWidth - 20,
        align: 'left',
        vAlign: 'bottom',
        size: textOptions.debugText.size * 0.66
      })
      txt.matrix.setConstraints(
        ReadonlyPin.FullSize,
        ReadonlyPin.TopLeft,
        ReadonlyPin.BottomLeft.cloneOffset(0, -10)
      )
      __skyTimerHelper = new SkyTimerTimelineHelper(txt)
      listenToProperty(
        skyTimerControllerWrapper,
        'controller',
        onSkyTimerController
      )
      __skyTimerHelper.frustumCulled = false
      __skyTimerHelper.matrix.setConstraints(
        new Pin(1, 0, -10, 60),
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.cloneOffset(5, 65)
      )

      return [txt, __skyTimerHelper]
    },
    () => {
      const c = skyTimerControllerWrapper.controller
      if (__skyTimerHelper && c) {
        c.stopListeningToTimeSyncs(
          __skyTimerHelper.addTimeSync,
          __skyTimerHelper.removeTimeSync
        )
      }
    }
  )
)

let __tmv: TimeMarkerVisualizer | undefined
debuggables.register(
  'info/timing',
  new Debuggable(
    () => {
      __tmv = new TimeMarkerVisualizer(getTimeMarker())
      __tmv.mesh.matrix.setConstraints(
        undefined,
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.cloneOffset(0, 60)
      )
      // applyPositionLayoutConstraint(txt, ReadonlyPin.TopLeft)
      return [__tmv.mesh]
    },
    () => {
      if (__tmv) {
        __tmv.disable()
      }
    }
  )
)

new NiceMethod(
  'GL Context',
  () => {
    renderer.forceContextLoss()
  },
  'Lose Context',
  'graphics',
  -1000
)

debuggables.register(
  'graphics/particles/missiles',
  new Debuggable(async () => {
    const overlay = createCloseDebugOverlay(true)
    overlay.matrix.opacity = 0
    const { modal, updateModalScroller } =
      await createCategoricalNiceModal('missiles')
    return [overlay, modal.mesh, updateModalScroller]
  }),
  1
)

debuggables.register(
  'graphics/particles/beams',
  new Debuggable(async () => {
    const overlay = createCloseDebugOverlay(true)
    overlay.matrix.opacity = 0
    const { modal, updateModalScroller } =
      await createCategoricalNiceModal('beams')
    return [overlay, modal.mesh, updateModalScroller]
  }),
  1
)
if (queryParams.debugMenu) {
  setTimeout(() => {
    debuggables.setActivePath(queryParams.debugMenu!, true)
  }, 1000)
}
