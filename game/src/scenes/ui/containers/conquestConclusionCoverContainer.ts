import { UI } from '..'
import { ConclusionBackgrounds } from '../components/ConclusionBackground'
import UIContainer from '../components/UIContainer'

export default class ConquestConclusionCoverContainer extends UIContainer {
  private _conquestBackground: ConclusionBackgrounds | undefined
  constructor(ui: UI, priority: number) {
    super(ui, 'conquestConclusionCover', {
      priority
    })
  }
  protected async init() {
    const conquestBG = new ConclusionBackgrounds()
    await conquestBG.ready
    // conquestBG.mesh.matrix.setConstraints(
    //   new SizePin(1, 1, 1920 / 1080, 'crop'),
    //   new Pin(0.5, 0.2),
    //   new Pin(0.5, 0.2)
    // )

    // makeInteractive(conquestBG.mesh, {
    //   cursor: 'default',
    // })

    this.add(conquestBG.mesh)
    this._conquestBackground = conquestBG
  }
  async fadeIn(duration: number = 400) {
    super.fadeIn()
    this.active = true
    this.visible = true
    await this._conquestBackground!.show(duration)
  }
  async fadeOut(duration: number) {
    await super.fadeOut(duration)
    this._conquestBackground?.disposeTextures()
  }
  hide() {
    super.hide()
    this._conquestBackground?.disposeTextures()
  }
}
