import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { identityClient } from '~/clients/IdentityClient/IdentityClient'
import { Button } from '~/shared/components/Button'
import { captureError } from '~/shared/helpers/sentry'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useCommerceCapabilities } from '~/shared/queries/useCommerceCapabilities'
import { updateSkypassSelectorState } from '~/shared/state/skypass-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SkyPassPurchaseButtonsStyle } from './SkyPassPurchaseButtons.css'

const CC_ADORNMENT = { icon: 'credit-card' } as const
const SPINNER_ADORNMENT = { icon: 'spinner' } as const

export const IdentitySkyPassPurchaseButtons = memo(() => {
  const { t } = useTranslation()
  const isTablet = useResponsiveQuery('tablet')
  const { data, isLoading } = useCommerceCapabilities()
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const capability = data?.premiumSkyPass

  const startCheckout = useCallback(async () => {
    if (!capability?.available || isStartingCheckout) return
    setIsStartingCheckout(true)
    try {
      const checkout = await identityClient.createPremiumSkyPassCheckout()
      updateSkypassSelectorState('isSkypassCheckoutActive', true)
      window.location.replace(checkout.url)
    } catch (error) {
      setIsStartingCheckout(false)
      captureError(error, 'Could not generate checkout link', true, false)
    }
  }, [capability?.available, isStartingCheckout])

  const isBusy = isLoading || isStartingCheckout
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }),
        SkyPassPurchaseButtonsStyle
      )}
    >
      <Button
        height={isTablet ? '52px' : '36px'}
        frameType="default"
        colorType="orange"
        disabled={!capability?.available || isBusy}
        onClick={startCheckout}
        leftAdornment={isBusy ? SPINNER_ADORNMENT : CC_ADORNMENT}
        className={FullWidthButtonStyle}
        buttonClassName={FullWidthButtonStyle}
        text={
          isBusy
            ? ''
            : capability?.available
              ? capability.price.display
              : t('purchaseSkypass.unavailable')
        }
      />
    </div>
  )
})

IdentitySkyPassPurchaseButtons.displayName = 'IdentitySkyPassPurchaseButtons'
