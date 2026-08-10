import queryParams from '~/queryParams'

import { UI } from '..'
import { SplashComposition } from '../components/SplashComposition'
import UIContainer from '../components/UIContainer'
import {
  loadSplashTextures,
  SplashTextures
} from '../components/utils/splashUtils'

export default class SplashContainer extends UIContainer {
  textures: SplashTextures
  splash: SplashComposition

  constructor(ui: UI, priority: number) {
    super(ui, 'splash', {
      priority
    })
  }

  async fadeIn() {
    await super.fadeIn(1000)
    await this.splash.show()
  }

  protected async init() {
    this.textures = await loadSplashTextures(queryParams.tutorialLevel ?? '')
    this.splash = new SplashComposition(
      this.textures.splashFg,
      this.textures.splashBg
    )
    this.add(this.splash)
  }
}
