import { getAssetsManager } from '~/assets'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class EmoteRingContainer extends UIContainer {
  enabled = false
  cardSelectionFinished = false

  constructor(ui: UI, priority: number) {
    super(ui, 'emoteRing', {
      priority
    })
  }

  protected async init() {
    await getAssetsManager().loadAsset('uiSmall')
  }
}
