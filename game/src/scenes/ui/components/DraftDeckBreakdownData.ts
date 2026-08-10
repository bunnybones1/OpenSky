import { Element } from '@skyweaver/state-metadata'

import { elementsArr } from '~/constants'
import { DraftStateCard } from '~/tests/draftMockup/DraftState'
import { getCachedCardStateView } from '~/tests/draftMockup/getCachedCardStateView'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { IDeckBreakdownData } from './IDeckBreakdownData'

export default class DraftDeckBreakdownData implements IDeckBreakdownData {
  listeners: Array<() => void> = []
  unitCounter = 0
  spellCounter = 0
  elementCounter: { [K in Element]: number } = {
    air: 0,
    dark: 0,
    earth: 0,
    fire: 0,
    light: 0,
    metal: 0,
    mind: 0,
    water: 0,
    sky: 0
  } as const

  regenBreakdown(cards: TrackableCollection<DraftStateCard>) {
    this.unitCounter = 0
    this.spellCounter = 0
    for (const key of elementsArr) {
      this.elementCounter[key] = 0
    }
    for (const card of cards.items) {
      const cardView = getCachedCardStateView(card)

      this.elementCounter[cardView.state.view.element]++
      if (cardView.state.view.type === 'unit') {
        this.unitCounter++
      }
      if (cardView.state.view.type === 'spell') {
        this.spellCounter++
      }
    }

    for (const cb of this.listeners) {
      cb()
    }
  }

  listenForChange(cb: () => void, firstOneFree = true) {
    this.listeners.push(cb)
    if (firstOneFree) {
      cb()
    }
  }
}
