import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class RandomTestsContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'randomTests', {
      priority
    })
    //DO NOT ADD ANYTHING HERE
    //This container is reserved to have things added to it dynamically via tests
  }

  protected async init() {
    //DO NOTHING
  }
}
