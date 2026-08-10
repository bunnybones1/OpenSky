/* eslint-disable valtio/state-snapshot-rule */
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { createSearchParams } from 'react-router-dom'
import { replace } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { mobileState } from '~/shared/state/mobile-state'
import {
  skypassSelectorState,
  updateSkypassSelectorState
} from '~/shared/state/skypass-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'

export const useSkyPassPaymentEffects = (
  refetch: () => void,
  hasPremium?: boolean
) => {
  const { inProgressIAP } = useSnapshot(mobileState)
  const { t } = useTranslation()
  const { isSkypassIAPInProgress, isSkypassCheckoutActive, paymentHasCompleted } =
    useSnapshot(skypassSelectorState)
  const dispatch = useDispatch()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentSuccess = params.get('paymentSuccess')
    params.delete('paymentSuccess')
    dispatch(
      replace(
        `${ROUTES_CONFIG.routes.SKY_PASS.directPath}?${createSearchParams(params)}`
      )
    )

    if (paymentSuccess === 'true')
      updateSkypassSelectorState('paymentHasCompleted', false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isSkypassCheckoutActive) {
      updateSkypassSelectorState('isSkypassCheckoutActive', false)
      clearAllToasts()

      addToast({
        text: t('notification.skyPassSuccess'),
        secondaryText: t('notification.skyPassSuccessSecondary'),
        icon: 'check-circled',
        iconColor: 'forest4',
        duration: 5
      })
    }
  }, [isSkypassCheckoutActive, t])

  useEffect(() => {
    if (paymentHasCompleted) {
      refetch()
      clearAllToasts()
      addToast({
        text: t('notification.skyPassSuccess'),
        secondaryText: t('notification.skyPassSuccessSecondary'),
        icon: 'check-circled',
        iconColor: 'forest4',
        duration: 5
      })
      updateSkypassSelectorState('paymentHasCompleted', undefined)
    } else if (paymentHasCompleted === false)
      addToast({
        text: t('notification.skyPassCheckout'),
        icon: 'spinner',
        iconColor: 'white',
        isEvergreen: true
      })
  }, [paymentHasCompleted, refetch, t])

  useEffect(() => {
    if (inProgressIAP && isSkypassIAPInProgress) {
      if (inProgressIAP.type == 'initiated') {
        clearAllToasts()
        addToast({
          text: t('notification.skyPassCheckout'),
          icon: 'spinner',
          iconColor: 'white',
          isEvergreen: true
        })
      }
      if (inProgressIAP.type !== 'initiated') {
        updateSkypassSelectorState('isSkypassIAPInProgress', false)
        clearAllToasts()
      }
      if (inProgressIAP.type === 'completed') {
        refetch()
        addToast({
          text: t('notification.skyPassSuccess'),
          secondaryText: t('notification.skyPassSuccessSecondary'),
          icon: 'check-circled',
          iconColor: 'forest4',
          duration: 5
        })
      }
    }
  }, [isSkypassIAPInProgress, inProgressIAP, refetch, t])

  useEffect(() => {
    if (hasPremium && paymentHasCompleted === false) {
      updateSkypassSelectorState('paymentHasCompleted', true)
    }
  }, [hasPremium, paymentHasCompleted])
}
