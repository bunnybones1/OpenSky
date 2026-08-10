import { i18n } from '@opensky/language-manager'
import { delayPromise } from '@opensky/shared/utils/async'

import { BUTTON_MARGINS } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial/index'
import Mesh2D from '~/meshes/Mesh2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { MessageQuestProgress } from '~/state/StateSharedTypes'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class QuestsContainer extends UIContainer {
  thing: Mesh2D | null = null
  constructor(ui: UI, priority: number) {
    super(ui, 'quests', {
      priority
    })
  }
  protected init() {
    // nothing!
  }
  async showQuestProgress(q: MessageQuestProgress) {
    // const mesh
    if (this.thing) {
      const t = this.thing
      this.thing = null
      t.removeFromParent()
    }
    this.thing = new RectangleMesh(new RectangleMaterial({}))
    const p = Pin.fromPixels(250, 100)
    this.thing.matrix.setConstraints(
      p,
      ReadonlyPin.BottomRight.cloneOffset(BUTTON_MARGINS, BUTTON_MARGINS),
      ReadonlyPin.BottomRight
    )
    this.add(this.thing)

    const tm = new UITextMesh(
      i18n.t(`quests:${q.quest}.name`) +
        '\n' +
        `${q.currProgress}/${q.endProgress} (+${
          q.currProgress - q.prevProgress
        })`,
      {
        ...textOptions.generic,
        color: 'black',
        vAlign: 'top'
      }
    )
    tm.matrix.offset = ReadonlyPin.Top.cloneOffset(0, BUTTON_MARGINS / 2)
    this.thing.add(tm)

    const desc = new UITextMesh(i18n.t(`quests:${q.quest}.text`), {
      ...textOptions.generic,
      color: 'black',
      align: 'left',
      vAlign: 'top',
      width: p.x.offset - BUTTON_MARGINS
    })
    desc.matrix.offset = ReadonlyPin.TopLeft.cloneOffset(
      BUTTON_MARGINS / 2,
      BUTTON_MARGINS / 2 + 40
    )
    this.thing.add(desc)

    await this.fadeIn()
    await delayPromise(5000)
    await this.fadeOut()
  }
}
