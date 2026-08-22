import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { ItemType, PaymentProvider } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getPaymentProviderProductsKey } from '~/shared/constants/react-query-keys'

import { authenticationState } from '../state/authentication-state'

export const usePaymentProviderProducts = (
  provider: PaymentProvider,
  itemType: ItemType,
  isEnabled = true
) => {
  const { userAddress } = useSnapshot(authenticationState)
  return useQuery(
    getPaymentProviderProductsKey(provider, itemType),
    async () => {
      const { products } = await APIClient.opensky.listPaymentProviderProducts({
        provider,
        itemType
      })

      return {
        products,
        sequenceProductCode: products && products[0].code
      }
    },
    {
      enabled: isEnabled && !!userAddress
    }
  )
}
