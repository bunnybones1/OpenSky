import { analytics } from '@opensky/analytics'
import { useCallback, useEffect, useState } from 'react'
import { useEvent } from 'react-use'

import { useAnalytics } from '~/hooks/useAnalytics'
import { CookieSettingsDialog } from '~/hooks/useAppDialogs/components/CookieSettingsDialog'
import { ErrorDialog } from '~/hooks/useAppDialogs/components/ErrorDialog'
import { OfflineDialog } from '~/hooks/useAppDialogs/components/OfflineDialog'
import { useUpdatePageOffsets } from '~/hooks/useUpdatePageOffset'
import { useUserPilot } from '~/hooks/useUserPilot'
import { COOKIE_SETTINGS_DIALOG_ID } from '~/shared/constants/ui'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useSelector } from '~/shared/redux'
import { pathNameSelector } from '~/shared/redux/router/selectors'
import { ERROR_DIALOG_ID } from '~/shared/state/error-dialog-state'

/**
 * Restores the source app's wallet-independent global behavior for Google
 * identities. Wallet confirmation, burner conversion, and wallet-renaming
 * dialogs intentionally remain owned by LegacyApp.
 */
export const useIdentityAppShell = () => {
  const [isOnline, setIsOnline] = useState(true)
  const handleOnline = useCallback(() => setIsOnline(true), [])
  const handleOffline = useCallback(() => setIsOnline(false), [])

  useEvent('online', handleOnline)
  useEvent('offline', handleOffline)

  const { Dialog: ErrorDialogElement } = useDialog({
    Element: ErrorDialog,
    id: ERROR_DIALOG_ID
  })
  const { Dialog: CookieSettingsDialogElement } = useDialog({
    Element: CookieSettingsDialog,
    id: COOKIE_SETTINGS_DIALOG_ID
  })
  const { Dialog: OfflineDialogElement, openDialog: openOfflineDialog } = useDialog({
    Element: OfflineDialog,
    id: 'OFFLINE_DIALOG'
  })

  useEffect(() => {
    if (!isOnline) openOfflineDialog()
  }, [isOnline, openOfflineDialog])

  useAnalytics()
  useUserPilot()
  useUpdatePageOffsets({ includeBanners: false })

  const pathName = useSelector(pathNameSelector)
  useEffect(() => {
    analytics.trackView()
  }, [pathName])

  return {
    ErrorDialog: ErrorDialogElement,
    CookieSettingsDialog: CookieSettingsDialogElement,
    OfflineDialog: OfflineDialogElement
  }
}
