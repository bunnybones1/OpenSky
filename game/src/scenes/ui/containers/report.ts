import { Player } from '@skyweaver/state-metadata'

import apiClient from '~/apiClient'
import { BUTTON_HEIGHT, BUTTON_MARGINS, PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { accountsLoaded, store, storeHelper } from '~/state'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { NOOP } from '~/utils/jsUtils'
import {
  createButton,
  createButtonText,
  createGenericModal,
  createOverlay
} from '~/utils/ui'

import { UI } from '..'
import { TOP_BAR_HEIGHT } from '../components/Modal'
import PinnedButton from '../components/PinnedButton'
import UIContainer from '../components/UIContainer'
import DialogContainer from './dialog'

type ReportType = 'AFK' | 'BOT' | 'CHEATER'
const REPORT_TYPES: { [K in ReportType]: string } = {
  AFK: 'being AFK',
  BOT: 'bot activity',
  CHEATER: 'cheating'
}

export default class ReportContainer extends UIContainer {
  reportOptions: string[]
  reported: boolean
  constructor(ui: UI, priority: number) {
    super(ui, 'report', {
      priority,
      closeOnEscape: true
    })
  }
  protected async init() {
    this.reportOptions = []
    this.add(createOverlay(this, () => this.close()))
    const totalButtons = 5
    const height =
      totalButtons * BUTTON_HEIGHT + (totalButtons + 1) * BUTTON_MARGINS * 1.4
    const modal = await createGenericModal('none', 'none')
    modal.mesh.matrix.setConstraints(Pin.fromPixels(450, height))
    this.add(modal.mesh)
    const reportText = new UITextMesh(
      'Select a reason for reporting',
      textOptions.bigModalText
    )
    reportText.matrix.setConstraintsPosition(
      ReadonlyPin.Top.cloneOffset(0, BUTTON_HEIGHT - 15)
    )
    modal.mesh.add(reportText)

    let cursor = 21 + TOP_BAR_HEIGHT
    const makeLocalButton = (
      label: string,
      onClick: (button: PinnedButton, text: UITextMesh) => void,
      useFancyHighlight?: boolean,
      useRedButton?: boolean
    ) => {
      const button = createButton(
        modal.mesh,
        () => onClick(button, text),
        Pin.fromPixels(240, BUTTON_HEIGHT),
        ReadonlyPin.Top,
        ReadonlyPin.Top.cloneOffset(0, cursor),
        undefined,
        undefined,
        undefined,
        useFancyHighlight
      )
      if (useRedButton) {
        button.basePaletteRow = PALETTE_ROW.RED
      }
      cursor += BUTTON_HEIGHT + BUTTON_MARGINS * 1.4
      const text = createButtonText(button.mesh, label)
      return button
    }
    await accountsLoaded
    const oppt =
      storeHelper.getAccounts()[(1 - storeHelper.getPlayer()) as Player]
    const opptName = oppt.name
    const opptAddress = oppt.address
    const sendReport = (thisButton: PinnedButton, reportType: ReportType) => {
      DialogContainer.present(
        this.ui,
        `Are you sure you want to report this user?`,
        {
          label: 'CONFIRM',
          onSelect: () => {
            apiClient
              .reportAccount({
                report: {
                  matchId: store.matchID,
                  reportedAddress: opptAddress,
                  reporterComment: reportType
                }
              })
              .then(() =>
                // AFK, CHEATER, BOT
                DialogContainer.present(
                  this.ui,
                  `Reported ${opptName} successfully for ${REPORT_TYPES[reportType]}`,
                  {
                    label: 'OK',
                    onSelect: () => {
                      this.reported = true
                      this.close()
                    }
                  }
                )
              )
              .catch(err => {
                console.warn('Failed to submit report:', err)
                DialogContainer.present(
                  this.ui,
                  `Failed to report ${opptName}.`,
                  {
                    label: 'OK',
                    onSelect: NOOP
                  }
                )
                thisButton.disabled = false
              })
          },
          basePaletteRow: PALETTE_ROW.RED
        },
        {
          label: 'CANCEL',
          onSelect: () => {
            thisButton.disabled = false
          }
        },
        [`User: ${opptName}`, `Reason: ${REPORT_TYPES[reportType]}`]
      )
    }
    makeLocalButton(
      'DOES NOT PLAY (AFK)',
      thisButton => sendReport(thisButton, 'AFK'),
      false,
      true
    )

    makeLocalButton(
      'CHEATING',
      thisButton => sendReport(thisButton, 'CHEATER'),
      false,
      true
    )
    makeLocalButton(
      'BOT',
      thisButton => sendReport(thisButton, 'BOT'),
      false,
      true
    )

    makeLocalButton(
      'CANCEL',
      thisButton => {
        thisButton.disabled = false
        this.close()
      },
      false,
      false
    )
  }

  close() {
    playSound('audioFxCommon', 'BoxClose')
    this.fadeOut()
  }
}
