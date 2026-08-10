import { ItemType, PaymentProvider } from '@opensky/proto'
import { useCallback } from 'react'

import { APIClient } from '~/shared/clients'
import { captureError } from '~/shared/helpers/sentry'
import { usePaymentProviderProducts } from '~/shared/queries/usePaymentProviderProducts'
import { updateSkypassSelectorState } from '~/shared/state/skypass-state'

export const useProcessStripeSPOrder = () => {
  const { data: stripeIAPData } = usePaymentProviderProducts(
    PaymentProvider.STRIPE,
    ItemType.SW_SKYPASS
  )

  return useCallback(async () => {
    const stripeProductCode = stripeIAPData?.products[0]?.code
    try {
      const { checkout } = await APIClient.opensky.createStripePaymentIntent({
        productID: stripeProductCode as string
      })
      updateSkypassSelectorState('isSkypassCheckoutActive', true)
      if (checkout) window.location.replace(checkout.url)
    } catch (error) {
      captureError(error, 'Could not generate checkout link', true, false)
    }
  }, [stripeIAPData?.products])
}
