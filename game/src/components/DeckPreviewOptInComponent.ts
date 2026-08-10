import { Component, Entity } from 'gg'

import { IconIndicatorName } from '~/meshes/IconIndicator'

import { Components } from '.'
import DeckComponent from './DeckComponent'
import { ZoneData } from './ZoneComponent'

function __getAppropriateDeck(cardZone: ZoneData) {
  return DeckComponent.entities.items.find(e => {
    return (
      e.get('deck').ownedCardStatus ===
      `${cardZone.owner}_${cardZone.stateZone}`
    )
  })!
}

export default class DeckPreviewOptInComponent extends Component<
  Set<IconIndicatorName>
> {
  constructor(iconName: IconIndicatorName) {
    super(new Set([iconName]))
  }

  onAttach(entity: Entity<Components>) {
    for (const iconName of this.value) {
      this._changeCount(entity, iconName, 1)
    }
  }

  onDetach(entity: Entity<Components>) {
    for (const iconName of this.value) {
      this._changeCount(entity, iconName, -1)
    }
  }

  private _changeCount(
    entity: Entity<Components>,
    iconName: IconIndicatorName,
    delta: number
  ) {
    if (entity.has('zone')) {
      const cardZone = entity.get('zone')
      const dpm = __getAppropriateDeck(cardZone).get('deckPreviewManager')

      switch (iconName) {
        case 'dust':
          dpm.dusted += delta
          break
        case 'Summon':
          dpm.summon += delta
          break
        case 'ReturnToHand':
          dpm.returnToHand += delta
          break
        case 'buff-arrow-encircled':
          dpm.debuffed += delta
          break
        case 'buff-arrow-encircled-flipped-up':
          dpm.buffed += delta
          break
      }
    }
  }
}
