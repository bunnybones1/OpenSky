import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class DraftMockupContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'DraftMockup', {
      priority
    })
  }

  protected init() {
    //
  }
}
