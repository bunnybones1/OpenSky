import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Object3D } from 'three'

import { RelaxedCardAttributes } from '~/components/CardInstanceComponent'

export function createSyntheticHeroAbilityCountersData(
  visualsRoot: Object3D,
  cardView: RelaxedCardAttributes
) {
  const heroAbilityCounters = {
    progressRatio: 0,
    summary: '0/5'
  }

  let counters: typeof cardView.counters
  let maxCounters: typeof cardView.maxCounters

  function updateCountersSummary() {
    if (counters === undefined || maxCounters === undefined) {
      heroAbilityCounters.summary = ''
    } else {
      heroAbilityCounters.progressRatio = counters / maxCounters
      heroAbilityCounters.summary = `⧂${counters}/${maxCounters}`
    }
  }
  function onCountersChange(v: typeof cardView.counters) {
    counters = v
    updateCountersSummary()
  }
  listenToProperty(cardView, 'counters', onCountersChange)

  function onMaxCountersChange(v: typeof cardView.maxCounters) {
    maxCounters = v
    updateCountersSummary()
  }
  listenToProperty(cardView, 'maxCounters', onMaxCountersChange)

  const sceneHook = new Object3D()
  ;(sceneHook as any).onRemove = () => {
    stopListeningToProperty(cardView, 'counters', onCountersChange)
    stopListeningToProperty(cardView, 'maxCounters', onMaxCountersChange)
  }
  visualsRoot.add(sceneHook)

  return heroAbilityCounters
}
