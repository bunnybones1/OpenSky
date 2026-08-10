import { copyTextToClipboard } from '@opensky/shared/utils/copyToClipboard'

import { PALETTE_ROW, TURN_TIMER_WARNING_FRACTION } from '~/constants'
import env from '~/env'
import BaseButton from '~/scenes/ui/components/BaseButton'
import PaletteMappedButton from '~/scenes/ui/components/Button'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import UITextMesh from '~/systems/text/UITextMesh'

import { playSound } from './soundHelpers'

export function possiblyAdjustButtonRedGreenPalette(
  button: PaletteMappedButton,
  endTime: number
) {
  if (env.TURN_TIMER_ENABLED) {
    const timeLeft = endTime - Date.now()
    const ratioLeft = timeLeft / env.TURN_TIMER_MAX
    const isButtonUrgent =
      matchInfoStore.isPlayerTurn && ratioLeft < 1 - TURN_TIMER_WARNING_FRACTION
    const newColor = isButtonUrgent ? PALETTE_ROW.RED : PALETTE_ROW.GREEN
    if (button.basePaletteRow !== newColor) {
      button.basePaletteRow = newColor
    }
    if (button.highlightUrgent !== isButtonUrgent) {
      if (isButtonUrgent) {
        playSound('audioFxCommon', 'NoActionsLeft')
      }
      button.highlightUrgent = isButtonUrgent
    }
    return isButtonUrgent
  }
  return false
}

export function copyToClipboardButton(text: () => string) {
  return async (button: BaseButton, label: UITextMesh) => {
    button.disabled = true
    const oldText = label.text
    try {
      try {
        await navigator.clipboard.writeText(text())
      } catch (err) {
        if (!copyTextToClipboard(text())) {
          throw new Error(`Copy Text alternate method failed.`)
        }
      }
      label.text = 'Copied!'
    } catch (err) {
      console.error(err)
      label.text = 'Copy Failed'
    } finally {
      setTimeout(() => {
        button.disabled = false
        label.text = oldText
      }, 2000)
    }
  }
}
