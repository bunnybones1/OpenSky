import { createOverlay } from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class ErrorsContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'errors', {
      priority
    })
  }

  protected init() {
    createOverlay(this, () => undefined)
  }
}
