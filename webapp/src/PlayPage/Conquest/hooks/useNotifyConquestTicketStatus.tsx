import {
  isAndroidNativeApp,
  isIOSNativeApp
} from '@opensky/shared/check-mobile-app-type'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrevious } from 'react-use'
import { useSnapshot } from 'valtio'

import { trackIAP } from '~/shared/helpers/analytics-old'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  conquestTicketSelectorState,
  updateConquestTicketsSelectorState
} from '~/shared/state/conquest-tickets-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'

export const useNotifyConquestTicketStatus = (checkConversion?: boolean) => {
  const { t } = useTranslation()
  const { userAddress } = useSnapshot(authenticationState)
  const { data: tokenBalances } = useConquestAndUSDCBalances(true)
  const { hasPurchasedConquest, hasConvertedConquestTicket } = useSnapshot(
    conquestTicketSelectorState
  )
  const tradableConquestTickets = tokenBalances?.conquestTicketBalance.tradable
  const nonTradableConquestTickets = tokenBalances?.conquestTicketBalance.nonTradable
  const previousNonTradableConquestBalance = usePrevious(nonTradableConquestTickets)

  useEffect(() => {
    if (
      checkConversion &&
      !!nonTradableConquestTickets &&
      previousNonTradableConquestBalance !== undefined &&
      hasConvertedConquestTicket &&
      tradableConquestTickets === 0
    ) {
      clearAllToasts()
      addToast({
        text: t('notification.conquestTicketSuccess'),
        secondaryText: t('notification.conquestTicketConversionSuccessSecondary'),
        icon: 'check-circled',
        iconColor: 'forest4',
        duration: 5
      })

      updateConquestTicketsSelectorState('hasConvertedConquestTicket', false)
    }
  }, [
    checkConversion,
    tradableConquestTickets,
    nonTradableConquestTickets,
    previousNonTradableConquestBalance,
    hasConvertedConquestTicket,
    t
  ])

  useEffect(() => {
    if (
      !!nonTradableConquestTickets &&
      previousNonTradableConquestBalance !== undefined &&
      hasPurchasedConquest &&
      nonTradableConquestTickets > previousNonTradableConquestBalance
    ) {
      clearAllToasts()
      addToast({
        text: t('notification.conquestTicketSuccess'),
        secondaryText: t('notification.conquestTicketSuccessSecondary'),
        icon: 'check-circled',
        iconColor: 'forest4',
        duration: 5
      })

      updateConquestTicketsSelectorState('hasPurchasedConquest', false)

      const userInfo = {
        quantity:
          nonTradableConquestTickets - (previousNonTradableConquestBalance || 0),
        address: userAddress
      }
      if (isIOSNativeApp()) {
        trackIAP('Minted', userInfo, 'ios')
      } else if (isAndroidNativeApp()) {
        trackIAP('Minted', userInfo, 'android')
      }
    }
  }, [
    nonTradableConquestTickets,
    userAddress,
    previousNonTradableConquestBalance,
    hasPurchasedConquest,
    t
  ])
}
