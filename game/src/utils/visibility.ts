import { makeSafetyCheckFromConstStringArray } from '@opensky/shared/typeHelpers'

const StateKeyStrings = [
  'hidden',
  'webkitHidden',
  'mozHidden',
  'msHidden'
] as const
type StateKey = (typeof StateKeyStrings)[number]

const EventKeyStrings = [
  'visibilitychange',
  'webkitvisibilitychange',
  'mozvisibilitychange',
  'msvisibilitychange'
]
type EventKey = (typeof EventKeyStrings)[number]

const keys: { [K in StateKey]: EventKey } = {
  hidden: 'visibilitychange',
  webkitHidden: 'webkitvisibilitychange',
  mozHidden: 'mozvisibilitychange',
  msHidden: 'msvisibilitychange'
} as const

const isStateKey = makeSafetyCheckFromConstStringArray(StateKeyStrings)

type VisibilityCallback = (hidden: boolean) => void

let hidden = false
const callbacks: Array<VisibilityCallback> = []

function onVisibilityChange(stateKey: StateKey) {
  if (stateKey in document) {
    //@ts-ignore
    hidden = document[stateKey]
    for (const cb of callbacks) {
      cb(hidden)
    }
  }
}

for (const sKey of StateKeyStrings) {
  if (isStateKey(sKey) && sKey in document) {
    document.addEventListener(keys[sKey], onVisibilityChange.bind(null, sKey))
    break
  }
}

export function listenForVisibilityChange(callback: VisibilityCallback) {
  callback(hidden)
  callbacks.push(callback)
}
