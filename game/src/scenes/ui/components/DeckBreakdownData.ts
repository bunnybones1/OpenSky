import { Element } from '@skyweaver/state-metadata'

import CardInstanceComponent from '~/components/CardInstanceComponent'
import { elementsArr } from '~/constants'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import { IDeckBreakdownData } from './IDeckBreakdownData'

export default class DeckBreakdownData implements IDeckBreakdownData {
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

  regenBreakdown() {
    this.unitCounter = 0
    this.spellCounter = 0
    for (const key of elementsArr) {
      this.elementCounter[key] = 0
    }
    for (const card of this.cards.items) {
      this.elementCounter[card.value.state.view.element]++
      if (card.value.state.view.type === 'unit') {
        this.unitCounter++
      }
      if (card.value.state.view.type === 'spell') {
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

  constructor(
    private cards: ReadonlyTrackableCollection<CardInstanceComponent>
  ) {
    cards.listenForChange(() => {
      this.regenBreakdown()
    })
  }
}
