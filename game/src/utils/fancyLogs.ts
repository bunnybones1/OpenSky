import { translate } from '@opensky/language-manager'
import { Locatable } from '@opensky/shared/cardCache'
import {
  CardEvent,
  CardLocation,
  Phase,
  PlayerAction,
  ResolvedPhase,
  SkyWeaver
} from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { SHOULD_LOG_STORY } from '~/constants'

import { stringIsNumberRepr } from './stringUtils'

let __id = 0
const __tabs: string[] = []
let tab = ''
for (let i = 0; i < 100; i++) {
  __tabs.push(tab)
  tab += '\t'
}

export class TabbedLogger {
  private _id = __id++
  constructor(private _tabCount = 0) {
    //
  }
  shiftTabs(offset: 1 | -1) {
    this._tabCount += offset
  }
  log(...args: any[]) {
    args[0] = this._id + ': ' + __tabs[this._tabCount] + args[0]
    console.log(...args)
  }

  logAction(
    phase: 'ENTER' | 'EXIT',
    nodeType: string,
    action: Phase | ResolvedPhase | CardEvent<SkyWeaver> | PlayerAction,
    found: boolean
  ) {
    if (phase === 'EXIT') {
      this.shiftTabs(-1)
    }
    this.log(
      `%c[${phase} ${nodeType} %c${action.type}%c]\n%c${JSON.stringify(
        action,
        null,
        2
      )}`,
      `color: blue`,
      `color: ${found ? 'blue' : 'red'}`,
      `color: blue`,
      `color: black`
    )
    if (phase === 'ENTER') {
      this.shiftTabs(1)
    }
  }

  logParallel(phase: 'ENTER' | 'EXIT') {
    if (phase === 'EXIT') {
      this.shiftTabs(-1)
    }
    if (phase === 'ENTER') {
      this.shiftTabs(1)
    }
  }

  logMissingAction(phase: 'ENTER' | 'EXIT', nodeType: string) {
    this.log(`%c[${phase} ${nodeType}] missing`, 'color: red')
  }

  logStory(...args: any[]) {
    if (SHOULD_LOG_STORY) {
      this.log('%c[story]', 'color: green', ...args)
    }
  }

  clone() {
    return new TabbedLogger(this._tabCount)
  }
}
export const fancyLogger = new TabbedLogger()

export function getCardName(locatable: Locatable | CardLocation) {
  const card = getCardCache().getInstance(locatable)
  if (card) {
    return getCardInstanceName(card)
  } else {
    return `unknown card instance (${JSON.stringify(locatable)})`
  }
}

export function getCardInstanceName(view?: RelaxedCardInstance) {
  if (view && stringIsNumberRepr(view.base)) {
    return `${translate.card.name(view.base)} (${view.id})`
  } else {
    return `unknown (${view?.base})`
  }
}
