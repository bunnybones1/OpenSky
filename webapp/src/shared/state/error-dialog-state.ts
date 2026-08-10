import { proxy } from 'valtio'

import { controlDialog } from '../hooks/useDialog/control-dialog'

interface ErrorDialogState {
  title?: string

  error?: string
  errorDetails?: string
  errorStack?: string
}

export const errorDialogState = proxy<ErrorDialogState>({
  title: undefined,
  error: undefined,
  errorDetails: undefined,
  errorStack: undefined
})

export const ERROR_DIALOG_ID = 'ERROR_DIALOG_ID'

export const showErrorDialog = ({
  title,
  error,
  errorDetails,
  errorStack
}: ErrorDialogState) => {
  errorDialogState.title = title
  errorDialogState.error = error
  errorDialogState.errorDetails = errorDetails
  errorDialogState.errorStack = errorStack

  if (!!title) {
    const { openDialog } = controlDialog(ERROR_DIALOG_ID)

    openDialog()
  }
}

export const resetErrorDialogState = () => {
  errorDialogState.title = undefined
  errorDialogState.error = undefined
  errorDialogState.errorDetails = undefined
  errorDialogState.errorStack = undefined
}
