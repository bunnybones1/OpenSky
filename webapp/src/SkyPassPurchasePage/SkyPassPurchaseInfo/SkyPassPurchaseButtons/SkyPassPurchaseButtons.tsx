import {
  isAndroidNativeApp,
  isIOSNativeApp
} from '@opensky/shared/check-mobile-app-type'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SKYPASS_UNIT_PRICE } from '~/shared/constants/skypass'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useIsCategoryThreeState } from '~/shared/hooks/useIsCategoryThreeState'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { mobileState } from '~/shared/state/mobile-state'
import { skypassSelectorState } from '~/shared/state/skypass-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useProcessSPIAP } from './hooks/useProcessSPIAP'
import { useProcessSPUSDCOrder } from './hooks/useProcessSPUSDCOrder'
import { useProcessStripeSPOrder } from './hooks/useProcessStripeSPOrder'
import { SkyPassPurchaseButtonsStyle } from './SkyPassPurchaseButtons.css'

const isIOSApp = isIOSNativeApp()
const isAndroidApp = isAndroidNativeApp()
const CC_ADORNMENT = { icon: 'credit-card' } as const
const USDC_ADORNMENT = { icon: 'usdc' } as const
const SPINNER_ADORNMENT = { icon: 'spinner' } as const

export const SkyPassPurchaseButtons = memo(() => {
  const isTablet = useResponsiveQuery('tablet')
  const { t } = useTranslation()
  const isCat3State = useIsCategoryThreeState()
  const { IAPs } = useSnapshot(mobileState)

  const skypassProduct = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return IAPs.find((product) => product.iapType === 'skypass')
  }, [IAPs])

  const { navigateToSkypass } = useNavigateToSkyPass()
  const processStripeOrder = useProcessStripeSPOrder()
  const processIAP = useProcessSPIAP(navigateToSkypass, skypassProduct)

  const {
    processSPUSDCOrder,
    isLoadingSkyPassPrice,
    isProcessingUSDCOrder,
    ticketCost
  } = useProcessSPUSDCOrder(navigateToSkypass)
  const { data: tokenBalances } = useConquestAndUSDCBalances()

  const iapSupportedRegion = !isCat3State

  // TODO: Remove android check when android IAP issue is resolved.
  const allowsIAP = skypassProduct !== undefined

  const { isSkypassCheckoutActive } = useSnapshot(skypassSelectorState)

  const isUSDCButtonDisabled = useMemo(() => {
    return (
      isProcessingUSDCOrder ||
      isLoadingSkyPassPrice ||
      !tokenBalances ||
      !tokenBalances.USDCBalance ||
      tokenBalances.USDCBalance < ticketCost ||
      !iapSupportedRegion
    )
  }, [
    isProcessingUSDCOrder,
    ticketCost,
    iapSupportedRegion,
    isLoadingSkyPassPrice,
    tokenBalances
  ])

  const buttonText = useMemo(() => {
    if (isProcessingUSDCOrder || tokenBalances === undefined) return ''
    if (isLoadingSkyPassPrice) return t('skypass.loadingSkypassPrices')
    return `${ticketCost} USDC`
  }, [isProcessingUSDCOrder, tokenBalances, isLoadingSkyPassPrice, ticketCost, t])

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
      {!!allowsIAP && (
        <Button
          height={isTablet ? '52px' : '36px'}
          className={FullWidthButtonStyle}
          buttonClassName={FullWidthButtonStyle}
          onClick={processIAP}
          frameType="default"
          colorType="orange"
          text={t('purchaseSkypass.inAppPurchase')}
        />
      )}
      {!isIOSApp && (
        <>
          {!isAndroidApp && !allowsIAP && (
            <Button
              height={isTablet ? '52px' : '36px'}
              frameType="default"
              colorType="orange"
              disabled={isSkypassCheckoutActive || isProcessingUSDCOrder}
              onClick={processStripeOrder}
              leftAdornment={CC_ADORNMENT}
              className={FullWidthButtonStyle}
              buttonClassName={FullWidthButtonStyle}
              text={`$${SKYPASS_UNIT_PRICE}`}
            />
          )}
          <Button
            height={isTablet ? '52px' : '36px'}
            frameType="default"
            colorType="blue"
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
            disabled={isUSDCButtonDisabled}
            leftAdornment={
              isProcessingUSDCOrder ||
              tokenBalances === undefined ||
              isLoadingSkyPassPrice
                ? SPINNER_ADORNMENT
                : USDC_ADORNMENT
            }
            text={buttonText}
            onClick={processSPUSDCOrder}
          />
        </>
      )}
    </div>
  )
})

SkyPassPurchaseButtons.displayName = 'SkyPassPurchaseButtons'
