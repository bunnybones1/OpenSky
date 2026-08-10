import { getAssetsManager } from '~/assets'

import { UI } from '..'
import ProgressBar from '../components/ProgressBar'
import UIContainer from '../components/UIContainer'

export default class PreloadContainer extends UIContainer {
  progressBar: ProgressBar | undefined
  constructor(ui: UI, priority: number) {
    super(ui, 'preload', { priority })
  }

  update() {
    if (this.progressBar) {
      this.progressBar.update()
    }
  }

  updateProgress(value: number) {
    if (this.progressBar) {
      this.progressBar.progress = value
    }
  }

  protected async init() {
    await getAssetsManager().loadAsset('uiPreloader')

    const progressBar = new ProgressBar()

    this.add(progressBar.mesh)
    progressBar.complete.then(() => this.fadeOut())
    this.progressBar = progressBar
  }
}
