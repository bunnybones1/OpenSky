// import * as Sentry from '@sentry/browser'
import { useCallback } from 'react'

import { MobileClient } from '~/shared/clients'
import { WebIAP } from '~/shared/state/mobile-state'
import {
  SkypassSelectorState,
  updateSkypassSelectorState
} from '~/shared/state/skypass-state'

export const useProcessSPIAP = (
  navigateToSkypass: (
    rewardToSelect?: SkypassSelectorState['selectedLevelAndReward']
  ) => void,
  skypassProduct: WebIAP | undefined
) => {
  return useCallback(async () => {
    // Sentry.captureMessage(
    //   'Skypass IAP Data: ' + JSON.stringify(skypassProduct),
    //   'info'
    // )
    updateSkypassSelectorState('isSkypassIAPInProgress', true)

    const productID = String(skypassProduct?.productId).trim()

    MobileClient.purchaseIAPProduct(productID)

    // Sentry.captureMessage(
    //   'Purchasing Skypass Premium with product ID: ' + productID,
    //   'info'
    // )

    navigateToSkypass()
  }, [navigateToSkypass, skypassProduct])
}
