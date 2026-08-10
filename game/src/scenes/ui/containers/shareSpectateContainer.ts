import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'

import apiClient from '~/apiClient'
import { COLOR_MODAL_OUTLINE_PURPLE } from '~/colors/colorLibrary'
import { BUTTON_HEIGHT, BUTTON_MARGINS, PALETTE_ROW } from '~/constants'
import { copyToClipboardButton } from '~/helpers/buttonHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { store } from '~/state'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { getSharedRectangle2DBufferGeometry } from '~/utils/geometry'
import { NOOP } from '~/utils/jsUtils'
import {
  createButton,
  createButtonText,
  createGenericModal,
  createOverlay
} from '~/utils/ui'

import { UI } from '..'
import Button from '../components/Button'
import UIContainer from '../components/UIContainer'
import DialogContainer from './dialog'

if (import.meta.hot) {
  import.meta.hot.accept('./dialog', () => {
    console.warn(
      'DialogContainer updated, not forcing a refresh via shareSpectateContainer.ts'
    )
  })
}
export default class ShareSpectateContainer extends UIContainer {
  concedeButton: Button
  privateCode = ''
  constructor(ui: UI, priority: number) {
    super(ui, 'shareSpectate', {
      priority,
      closeOnEscape: true
    })
  }
  protected init() {
    apiClient
      .getPrivateSpectateCode({})
      .then(c => {
        this.privateCode = c.code
      })
      .catch(err => {
        if (queryParams.allowOfflineSpectating) {
          console.warn(err)
        } else {
          store.fireClientError(err)
        }
      })
    createOverlay(this, () => {
      this.close()
    })

    const mobileHeadOffset = device.isMobile ? 6 : 0
    const titleHeight = 60 + mobileHeadOffset
    const modal = createGenericModal('none', 'none')

    const contentsSizePin = Pin.fromPixels(420, 100)
    const modalHeader = new Object2D()
    modalHeader.shouldRenderAsGroup = true
    modal.mesh.add(modalHeader)
    modal.mesh.matrix.setConstraints(contentsSizePin)

    let cursor = 21 + titleHeight
    const textMesh = new UITextMesh(
      i18n.t('common:options.spectate.spectateLink')!,
      textOptions.modalTitle
    )
    textMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Top.cloneOffset(0, 27 + mobileHeadOffset)
    )
    modalHeader.add(textMesh)
    const line = new Mesh2D(
      getSharedRectangle2DBufferGeometry(),
      new RectangleMaterial({})
    )
    line.matrix.setConstraints(
      new Pin(1, 0, -2, 1),
      ReadonlyPin.Center,
      ReadonlyPin.Top.cloneOffset(0, titleHeight)
    )
    line.matrix.setColor(COLOR_MODAL_OUTLINE_PURPLE)
    modalHeader.add(line)

    const button = createButton(
      modalHeader,
      () => {
        this.close()
        this.ui.getContainer('settings').fadeIn()
      },
      Pin.fromPixels(80, BUTTON_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(18, 10)
    )
    createButtonText(button.mesh, i18n.t('common:options.back'))
    this.add(modal.mesh)

    const copyPublicButton = createButton(
      modal.mesh,
      () =>
        copyToClipboardButton(() => {
          return `${window.location.origin}${window.location.pathname}?mode=SPECTATE&spectateCode=${store.address}`
        })(copyPublicButton, copyPublicText),
      Pin.fromPixels(220 - BUTTON_MARGINS * 2, BUTTON_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, cursor)
    )
    cursor += BUTTON_HEIGHT + BUTTON_MARGINS
    const copyPublicText = createButtonText(
      copyPublicButton.mesh,
      i18n.t('common:options.spectate.copyPublicLink')
    )

    const copyPrivateButton = createButton(
      modal.mesh,
      () =>
        copyToClipboardButton(() => {
          return `${window.location.origin}${window.location.pathname}?mode=SPECTATE&spectateCode=${store.address}.${this.privateCode}`
        })(copyPrivateButton, copyPrivateText),
      Pin.fromPixels(220 - BUTTON_MARGINS * 2, BUTTON_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, cursor)
    )
    cursor += BUTTON_MARGINS + BUTTON_HEIGHT
    const copyPrivateText = createButtonText(
      copyPrivateButton.mesh,
      i18n.t('common:options.spectate.copyPrivateLink')
    )

    const resetPrivateButton = createButton(
      modal.mesh,
      () => {
        resetPrivateButton.disabled = true
        DialogContainer.present(
          this.ui,
          i18n.t('common:options.prompt.resetSpectate'),
          {
            label: i18n.t('common:options.confirm'),
            onSelect: () => {
              this.resetCode()
                .then(() =>
                  DialogContainer.present(
                    this.ui,
                    i18n.t('common:options.prompt.codeReset'),
                    {
                      label: i18n.t('common:options.ok'),
                      onSelect: () => {
                        resetPrivateButton.disabled = false
                        this.close()
                      }
                    }
                  )
                )
                .catch(err => {
                  console.warn('Failed to reset spectate code:', err)
                  DialogContainer.present(
                    this.ui,
                    i18n.t('common:options.prompt.failedReset'),
                    {
                      label: i18n.t('common:options.ok'),
                      onSelect: NOOP
                    }
                  )
                  resetPrivateButton.disabled = false
                })
            },
            basePaletteRow: PALETTE_ROW.RED
          },
          {
            label: i18n.t('common:options.cancel'),
            onSelect: () => {
              resetPrivateButton.disabled = false
            }
          },
          [i18n.t('common:options.prompt.spectateCodeInvalidateWarning')]
        )
      },
      Pin.fromPixels(220 - BUTTON_MARGINS * 2, BUTTON_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, cursor)
    )
    resetPrivateButton.basePaletteRow = PALETTE_ROW.RED
    createButtonText(
      resetPrivateButton.mesh,
      i18n.t('common:options.spectate.resetSpectateLink')
    )

    contentsSizePin.y.offset = cursor + BUTTON_MARGINS + BUTTON_HEIGHT
  }

  async resetCode() {
    this.privateCode = (
      await apiClient.getPrivateSpectateCode({ reset: true })
    ).code
  }

  close() {
    playSound('audioFxCommon', 'BoxClose')
    this.fadeOut()
  }
}
