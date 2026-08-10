import { DealerStepName, DraftDealerStep } from './dealerStepTypes'
import type DraftState from './DraftState'

export default class DealerPhase {
  getAllDestinations() {
    return this._routes.map(r => r[0])
  }
  private _routes: [DealerStepName, DraftDealerStep][] = []
  constructor(public name: DealerStepName) {}
  might(work: DraftDealerStep, name: DealerStepName) {
    this._routes.push([name, work])
    return this
  }
  or(work: DraftDealerStep, name: DealerStepName) {
    return this.might(work, name)
  }
  attempt(state: DraftState) {
    for (const possibility of this._routes) {
      if (possibility[1](state)) {
        return possibility[0]
      }
    }
    return undefined
  }
}
