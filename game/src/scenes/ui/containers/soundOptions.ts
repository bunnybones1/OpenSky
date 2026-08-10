import { i18n } from '@opensky/language-manager'

import { playSound } from '~/helpers/soundHelpers'
import { createCategoricalNiceModal } from '~/utils/createNiceModal'
import { createOverlay } from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class SoundOptionsContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'sound-options', {
      priority,
      closeOnEscape: true
    })
  }
  protected async init() {
    this.add(createOverlay(this, () => this.close()))

    const { modal, updateModalScroller } = await createCategoricalNiceModal(
      'sound',
      i18n.t('common:options.sound'),
      {
        onClick: () => {
          this.close()
          this.ui.getContainer('options').fadeIn()
        },
        text: '≤'
      },
      undefined,
      undefined,
      true,
      () => this.close()
    )
    this.update = updateModalScroller
    this.add(modal.mesh)
  }

  close() {
    playSound('audioFxCommon', 'BoxClose')
    this.fadeOut()
  }
}
