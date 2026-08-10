import { Account } from '@opensky/proto'
import { useCallback, useEffect, useState } from 'react'
import { useEvent } from 'react-use'

import { isNativeAppOutOfDate } from '~/helpers/is-native-app-out-of-date'
import {
  CONVERT_TO_SEQUENCE_WALLET_DIALOG,
  COOKIE_SETTINGS_DIALOG_ID,
  RENAME_BURNER_ACCOUNT_ID,
  SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID,
  STATE_CONFIRMATION_DIALOG_ID
} from '~/shared/constants/ui'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useUpdateUserStorage } from '~/shared/mutations/useUpdateUserStorage'
import { ERROR_DIALOG_ID } from '~/shared/state/error-dialog-state'

import { AppUpdateDialog } from './components/AppUpdateDialog'
import { ConvertToSequenceWalletDialog } from './components/ConvertToSequenceWalletDialog'
import { CookieSettingsDialog } from './components/CookieSettingsDialog'
import { ErrorDialog } from './components/ErrorDialog'
import { OfflineDialog } from './components/OfflineDialog'
import { RenameBurnerAccountDialog } from './components/RenameBurnerAccountDialog'
import { SequenceConfirmSignatureDialog } from './components/SequenceConfirmSignatureDialog/SequenceConfirmSignatureDialog'
import { SequenceConfirmSignatureDialogOverride } from './components/SequenceConfirmSignatureDialog/SequenceConfirmSignatureDialog.css'
import StateConfirmationDialog from './components/StateConfirmationDialog'

export const useAppDialogs = (authedAccount: Account | undefined | null) => {
  const [isOnline, setIsOnline] = useState(true)
  const updateUserStorage = useUpdateUserStorage()

  const handleOnlineEvent = useCallback(() => {
    setIsOnline(true)
  }, [])

  const handleOfflineEvent = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEvent('online', handleOnlineEvent)
  useEvent('offline', handleOfflineEvent)

  const { Dialog: _AppUpdateDialog, openDialog: openAppUpdateDialog } = useDialog({
    Element: AppUpdateDialog,
    id: 'APP_UPDATE_DIALOG',
    isClickoffDisabled: true,
    isCloseButtonDisabled: true
  })

  const { Dialog: _ErrorDialog } = useDialog({
    Element: ErrorDialog,
    id: ERROR_DIALOG_ID
  })

  const { Dialog: _OfflineDialog, openDialog: openOfflineDialog } = useDialog({
    id: 'OFFLINE_DIALOG',
    Element: OfflineDialog
  })

  const { Dialog: _SequenceConfirmSignatureDialog } = useDialog({
    Element: SequenceConfirmSignatureDialog,
    className: SequenceConfirmSignatureDialogOverride,
    id: SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID,
    isClickoffDisabled: true,
    isCloseButtonDisabled: true
  })

  const { Dialog: _CookieSettingsDialog } = useDialog({
    Element: CookieSettingsDialog,
    id: COOKIE_SETTINGS_DIALOG_ID
  })

  const { Dialog: _StateConfirmationDialog } = useDialog({
    Element: StateConfirmationDialog,
    id: STATE_CONFIRMATION_DIALOG_ID
  })

  const { Dialog: _ConvertToSequenceWalletDialog } = useDialog({
    Element: ConvertToSequenceWalletDialog,
    id: CONVERT_TO_SEQUENCE_WALLET_DIALOG,
    isCloseButtonDisabled: true,
    isClickoffDisabled: true
  })

  const { Dialog: _RenameBurnerAccountDialog, openDialog: openRenameBurnerDialog } =
    useDialog({
      Element: RenameBurnerAccountDialog,
      id: RENAME_BURNER_ACCOUNT_ID,
      isClickoffDisabled: true,
      isCloseButtonDisabled: true
    })

  useEffect(() => {
    const isOutOfDateInfo = isNativeAppOutOfDate()

    // Trigger Native App Update Modal
    if (isOutOfDateInfo === 'mobile') {
      openAppUpdateDialog()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isOnline) {
      openOfflineDialog()
    }
  }, [isOnline, openOfflineDialog])

  useEffect(() => {
    if (
      !!authedAccount?.name &&
      authedAccount.name.includes('OpenSky_') &&
      authedAccount.address.includes(authedAccount.name.split('_')[1])
    ) {
      openRenameBurnerDialog()
    }
  }, [authedAccount, openRenameBurnerDialog, updateUserStorage])

  return {
    AppUpdateDialog: _AppUpdateDialog,
    ErrorDialog: _ErrorDialog,
    OfflineDialog: _OfflineDialog,
    SequenceConfirmSignatureDialog: _SequenceConfirmSignatureDialog,
    CookieSettingsDialog: _CookieSettingsDialog,
    StateConfirmationDialog: _StateConfirmationDialog,
    ConvertToSequenceWalletDialog: _ConvertToSequenceWalletDialog,
    RenameBurnerAccountDialog: _RenameBurnerAccountDialog
  }
}
