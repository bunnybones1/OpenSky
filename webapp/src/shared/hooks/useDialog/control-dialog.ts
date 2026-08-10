import { AppPlatform, getAppPlatform } from '@opensky/shared/get-app-platform'
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock-upgrade'

import { isDialogAlreadyOpen } from './shared/is-dialog-already-open'
import { adjustLayoutOnDialogChange } from './useDialog'

const platform = getAppPlatform()
const isIOS = platform === AppPlatform.IOS_NATIVE || platform === AppPlatform.IOS_WEB

export const controlDialog = (id: string) => {
  const getDialog = () => document.getElementById(id)

  const openDialog = () => {
    const dialog = getDialog()

    if (!!dialog && dialog instanceof HTMLDialogElement && !dialog.open) {
      const alreadyHasDialog = isDialogAlreadyOpen()

      dialog.showModal()
      if (!alreadyHasDialog && !isIOS) {
        adjustLayoutOnDialogChange(true)
        disableBodyScroll(dialog, { reserveScrollBarGap: true })
      }
    }
  }

  const closeDialog = () => {
    const dialog = getDialog()

    if (!!dialog && dialog instanceof HTMLDialogElement && !!dialog.open) {
      const alreadyHasDialog = isDialogAlreadyOpen(id)

      dialog.close()
      if (!alreadyHasDialog && !isIOS) {
        adjustLayoutOnDialogChange(false)
        enableBodyScroll(dialog)
      }
    }
  }

  return {
    openDialog,
    closeDialog
  }
}
