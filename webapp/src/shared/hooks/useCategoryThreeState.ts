import { UserStorageKeys } from '@opensky/shared/constants'
import { useMemo } from 'react'

import { useUserStorage } from '../queries/useUserStorage'

export const useCat3State = () => {
  const { data: cat3State, isLoading } = useUserStorage(
    UserStorageKeys.CATEGORY_THREE_STATE
  )

  return useMemo(() => {
    return {
      isLoading,
      cat3State: cat3State?.state as string | undefined
    }
  }, [cat3State?.state, isLoading])
}
