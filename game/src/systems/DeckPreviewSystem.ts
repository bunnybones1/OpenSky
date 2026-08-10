import { System } from 'gg'

import { Components } from '~/components'
import DeckPreviewManagerComponent from '~/components/DeckPreviewManagerComponent'

export default class DeckPreviewSystem extends System<Components> {
  constructor() {
    super()
  }

  update() {
    for (const entity of DeckPreviewManagerComponent.entities.items) {
      entity.getComponent('deckPreviewManager')!.update(entity)
    }
  }
}
