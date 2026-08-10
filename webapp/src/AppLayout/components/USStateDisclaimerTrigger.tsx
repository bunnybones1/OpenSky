import { memo, useEffect } from 'react'

import env from '~/env'
import { STATE_CONFIRMATION_DIALOG_ID } from '~/shared/constants/ui'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useCat3State } from '~/shared/hooks/useCategoryThreeState'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'

const { openDialog } = controlDialog(STATE_CONFIRMATION_DIALOG_ID)

const USStateDisclaimerTrigger = memo(() => {
  const { cat3State, isLoading } = useCat3State()
  const { data: account } = useAuthedAccount()

  const isUS =
    !!window.sessStorage &&
    !!window.sessStorage.countryCode &&
    window.sessStorage.countryCode === 'US'

  const renderStateDisclaimer =
    !isLoading &&
    (!cat3State ||
      cat3State === 'Non-US Citizen' ||
      cat3State === 'No Longer US Citizen') &&
    isUS &&
    // Dont show while the user is still in the onboarding flow
    !!account &&
    account.level > 1 &&
    env.GEOBLOCKING // Won't show if geo blocking is turned off (for dev envs)

  useEffect(() => {
    if (renderStateDisclaimer) {
      openDialog()
    }
  }, [cat3State, isUS, renderStateDisclaimer])

  return null
})

USStateDisclaimerTrigger.displayName = 'USStateDisclaimerTrigger'

export default USStateDisclaimerTrigger
