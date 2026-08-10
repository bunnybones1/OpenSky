import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Object3D } from 'three'

import { RelaxedCardAttributes } from '~/components/CardInstanceComponent'

export function createSyntheticHeroAbilityChargesData(
  visualsRoot: Object3D,
  cardView: RelaxedCardAttributes
) {
  const heroAbilityCharges = {
    summary: '0'
  }
  let charges: typeof cardView.charges
  let maxCharges: typeof cardView.maxCharges
  function updateChargesSummary() {
    if (charges !== undefined || maxCharges !== undefined) {
      const t = charges === undefined ? maxCharges : charges
      heroAbilityCharges.summary = `⧀${t}`
    } else if (maxCharges === undefined) {
      heroAbilityCharges.summary = '⧁'
    } else {
      heroAbilityCharges.summary = ''
    }
  }

  function onChargesChange(v: typeof cardView.charges) {
    charges = v
    updateChargesSummary()
  }
  listenToProperty(cardView, 'charges', onChargesChange)

  function onMaxChargesChange(v: typeof cardView.maxCharges) {
    maxCharges = v
    updateChargesSummary()
  }
  listenToProperty(cardView, 'maxCharges', onMaxChargesChange)

  const sceneHook = new Object3D()
  ;(sceneHook as any).onRemove = () => {
    stopListeningToProperty(cardView, 'charges', onChargesChange)
    stopListeningToProperty(cardView, 'maxCharges', onMaxChargesChange)
  }
  visualsRoot.add(sceneHook)

  return heroAbilityCharges
}
