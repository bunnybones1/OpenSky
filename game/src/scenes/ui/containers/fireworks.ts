import { getAssetsManager } from '~/assets'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'

import { UI } from '..'
import Fireworks from '../components/Fireworks'
import UIContainer from '../components/UIContainer'

export default class FireworksContainer extends UIContainer {
  fireworks: Fireworks

  constructor(ui: UI, priority: number) {
    super(ui, 'fireworks', {
      priority
    })
  }

  update() {
    if (this.fireworks) {
      this.fireworks.update()
    }
  }

  async fadeIn() {
    this.fireworks.start()
    await super.fadeIn(0)
  }

  protected async init() {
    await getAssetsManager().loadAsset('particle')
    const fireworks = new Fireworks()
    const unscalingContainer = makeUnscalingContainer('uiHeight', 660)
    unscalingContainer.add(fireworks.mesh)
    this.add(unscalingContainer)
    this.fireworks = fireworks
  }

  async fadeOut() {
    this.fireworks.stop()
    await super.fadeOut(4000)
  }
}
