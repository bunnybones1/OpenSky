import { ModalStorageKeys, UserStorageKeys } from '@opensky/shared/constants'
import { useMemo } from 'react'

import { useUserStorage } from '../queries/useUserStorage'

type DismissedModals = { [key in ModalStorageKeys]: boolean }

const DEFAULT_DISMISSED_MODALS: DismissedModals = {
  [ModalStorageKeys.DISCLAIMER]: false,
  [ModalStorageKeys.DAILY_BONUS_XP]: false,
  [ModalStorageKeys.CONVERT_SILVER]: false,
  [ModalStorageKeys.CONQUEST_HERO_LOCK]: false,
  [ModalStorageKeys.ADD_FUNDS_POLYGON]: false,
  [ModalStorageKeys.FIRST_ACCESS_SKYPASS]: false
}

export const useDismissedModals = () => {
  const { data: dismissedModals, isLoading } = useUserStorage(
    UserStorageKeys.MODALS_TO_SKIP
  )

  return useMemo<DismissedModals | undefined>(() => {
    if (isLoading) return
    if (!dismissedModals) return DEFAULT_DISMISSED_MODALS
    return {
      ...DEFAULT_DISMISSED_MODALS,
      ...dismissedModals
    }
  }, [dismissedModals, isLoading])
}
