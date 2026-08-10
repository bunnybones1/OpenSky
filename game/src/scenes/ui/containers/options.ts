import { i18n } from '@opensky/language-manager'

import { playSound } from '~/helpers/soundHelpers'
import { createCategoricalNiceModal } from '~/utils/createNiceModal'
import { createOverlay } from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class OptionsContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'options', {
      priority,
      closeOnEscape: true
    })
  }
  protected async init() {
    this.add(createOverlay(this, () => this.close()))

    const optionsLabel = i18n.t('common:options.options')
    const { modal, updateModalScroller } = await createCategoricalNiceModal(
      'options',
      optionsLabel,
      {
        onClick: () => {
          this.close()
          this.ui.getContainer('settings').fadeIn()
        },
        text: '≤'
      },
      undefined,
      undefined,
      undefined,
      () => this.close(),
      'optionsBg'
    )
    this.update = updateModalScroller
    this.add(modal.mesh)
  }

  close() {
    playSound('audioFxCommon', 'BoxClose')
    this.fadeOut()
  }
}
