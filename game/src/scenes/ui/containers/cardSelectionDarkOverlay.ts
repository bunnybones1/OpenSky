import { createOverlay } from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class CardSelectionDarkOverlayContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'cardSelectionDarkOverlay', {
      priority
    })
  }
  protected init() {
    createOverlay(this, undefined, undefined, 0.945)
  }
}
