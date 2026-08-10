import styled from '@emotion/styled'
import { isIOSNativeApp } from '@opensky/shared/check-mobile-app-type'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import { ItemType, PlayerRank } from '~/lib/proto'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { CONQUEST_TICKET_UNIT_PRICE } from '~/shared/constants/market'
import { isConquestLocked } from '~/shared/constants/play'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { makeSelectSilversRoute } from '~/shared/helpers/routes/general'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useAccountsHighestRank } from '~/shared/hooks/useAccountsHighestRank'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useIsCategoryThreeState } from '~/shared/hooks/useIsCategoryThreeState'
import { useCardBalanceOverview } from '~/shared/queries/cards/useCardBalanceOverview'
import {
  TICKET_COST_FETCH_DEADLINE,
  useConquestTicketCost
} from '~/shared/queries/useConquestTicketCost'
import { authenticationState } from '~/shared/state/authentication-state'
import { mobileState, updateMobileState } from '~/shared/state/mobile-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { HeightOneHundredVhMinusOffset } from '~/shared/style/TopOffsetStyle.css'

import ConquestWarning from './components/ConquestWarning'
import IAPConquestModal from './components/IAPConquestModal'
import { PurchaseConquestIAPButton } from './PurchaseConquestIAPButton/PurchaseConquestIAPButton'
import { PurchaseWithUSDCDialog } from './PurchaseWithUSDCDialog/PurchaseWithUSDCDialog'
import { PURCHASE_WITH_USDC_DIALOG_ID } from './PurchaseWithUSDCDialog/shared/constants'

export const PurchaseConquestPage = memo(() => {
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { getAssetUrl } = useGetAssetContext()
  const { userAddress } = useSnapshot(authenticationState)
  const { IAPs, shouldShowConquestIAPModal } = useSnapshot(mobileState)
  const navigate = useNavigate()
  const { data: balanceOverview } = useCardBalanceOverview({ address: userAddress })

  const { Dialog, openDialog } = useDialog({
    Element: PurchaseWithUSDCDialog,
    id: PURCHASE_WITH_USDC_DIALOG_ID
  })

  const hasSilverCards =
    !!balanceOverview &&
    balanceOverview.frameBalanceOverview[ItemType.SW_SILVER_CARDS].owned !== 0

  // TODO: Remove android check when android IAP issue is resolved.
  const allowsIAP = IAPs.length > 0
  const isCat3State = useIsCategoryThreeState()

  const iapSupportedRegion = !isCat3State

  const confirmClearCart = (action: (...arg: any) => any) => {
    action()
  }

  const silverCardsClick = () => {
    navigate(makeSelectSilversRoute())
  }

  const usdcClick = () => {
    openDialog()
  }

  // Fetch price of tickets
  const { data: price, isLoading } = useConquestTicketCost(1)
  const ticketPrice = price ? formatUSDCBalance(price) : CONQUEST_TICKET_UNIT_PRICE
  const isFetching = isLoading

  // Fetching timer is 30, as specified in useConquestTicketCost.ts
  const [fetchingCountdown, setFetchingCountdown] = useState(
    TICKET_COST_FETCH_DEADLINE / 1000
  )
  useEffect(() => {
    const intervalId = setInterval(() => {
      setFetchingCountdown((fetchingCountdown) =>
        fetchingCountdown > 1 ? fetchingCountdown - 1 : 0
      )
    }, 1000)
    return () => clearInterval(intervalId)
  }, [])

  const setShowIAPQuantityModal = (value: boolean) => {
    updateMobileState('shouldShowConquestIAPModal', value)
  }

  const [showConquestLockedWarning, setShowConquestLockedWarning] = useState(false)

  const { data: authedAccount } = useAuthedAccount()
  const highestRank = useAccountsHighestRank(authedAccount)

  useEffect(() => {
    const conquestLocked = isConquestLocked(highestRank?.rank || PlayerRank.UNRANKED)

    setShowConquestLockedWarning(conquestLocked)
  }, [highestRank])

  const onBackClick = useCallback(() => {
    navigate(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath)
  }, [navigate])

  return (
    <>
      {Dialog}
      <FlexBox
        width="100%"
        type="centered-start-column"
        position="relative"
        overflow="hidden"
        className={HeightOneHundredVhMinusOffset}
      >
        <FlexBox
          height="100vh"
          style={{
            width: '100%',
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('webapp/backgrounds/ticketbg.webp')})`
              : undefined,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
            position: 'absolute',
            backgroundPosition: '50%'
          }}
        />
        <Box pt={[44, 44, 44, 44]} bg="purple1">
          <FlexBox
            position="absolute"
            left={0}
            top="0px"
            zIndex={100}
            width={['74px', '74px', '74px', '102px']}
          >
            <FancyBackButton onClick={onBackClick} />
          </FlexBox>
          <FlexBox
            zIndex={99}
            position="absolute"
            left={0}
            top="0px"
            style={{
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <FlexBox
              position="absolute"
              style={{
                width: '100%',
                height: '100px',
                background:
                  'linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)'
              }}
            />
            <FlexBox position="absolute" zIndex={2}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${356} ${36}`}
                aria-hidden={true}
                className="horizon-icon"
                height={!isTabletWide ? '50px' : '70px'}
              >
                <path
                  opacity="0.8"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0 0L15.4603 15.0811H36.4065L50.8694 29.1892H106.227L113.209 36H242.791L249.773 29.1892H305.131L319.593 15.0811H340.54L356 0H354.589L340.127 14.1081H335.552L350.015 0H348.605L334.142 14.1081H265.233L279.696 0H278.285L242.378 35.027H220.348L256.256 0H254.846L218.938 35.027H137.062L101.154 0H99.7439L135.652 35.027H113.622L77.7146 0H76.304L90.7669 14.1081H21.8581L7.39521 0H5.98465L20.4475 14.1081H15.8734L1.41058 0H0ZM91.7643 15.0811L105.23 28.2162H51.2825L37.8171 15.0811H91.7643ZM264.236 15.0811L250.77 28.2162H304.717L318.183 15.0811H264.236Z"
                  fill="url(#line-subtract-paint)"
                />
                <defs>
                  <radialGradient
                    id="line-subtract-paint"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(180.038 0.486486) rotate(88.4479) scale(35.5266 198.345)"
                  >
                    <stop stopColor="#705BAB" />
                    <stop offset="1" stopColor="#40306B" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </FlexBox>
            <Text
              fontSize={['22px', '22px', '22px', '38px']}
              fontWeight={'500'}
              fontFamily="condensed"
              style={{
                textAlign: 'center',
                marginTop: '12px',
                color: !isTabletWide ? 'white' : '#C5B4F5'
              }}
              zIndex={2}
            >
              {t('play.getTickets')}
            </Text>
          </FlexBox>
          {showConquestLockedWarning && !!getAssetUrl && (
            <ConquestWarning
              imageUrl={getAssetUrl('webapp/backgrounds/bg-delete-modal.webp')}
              callbackFn={(value) => setShowConquestLockedWarning(value)}
            />
          )}

          {shouldShowConquestIAPModal && !!getAssetUrl && (
            <IAPConquestModal
              imageUrl={getAssetUrl('webapp/backgrounds/bg-delete-modal.webp')}
              callbackFn={(value) => setShowIAPQuantityModal(value)}
            />
          )}

          <FlexBox
            left={0}
            width="100%"
            type="centered-start-column"
            flexWrap="nowrap"
            style={{ zIndex: 10 }}
            position="relative"
          >
            <Text
              fontSize={[16, 16, 18]}
              fontWeight={'500'}
              color="purple8"
              pt={['0px', '0px', '0px', '20px']}
              pb="8px"
              fontFamily="condensed"
            >
              {t('play.conquestCostExplanation', {
                ticketPrice: CONQUEST_TICKET_UNIT_PRICE
              })}
            </Text>

            <FlexBox
              type="centered-start-column"
              pb={[16, 16, 16, 40]}
              pt={[16, 16, 24, 32]}
              px={16}
              width={['80%', '80%', '80%', '100%']}
              bottom={['10px', '10px', '10px', '100px']}
              style={{
                position: 'fixed'
              }}
            >
              <ButtonContainer
                width="100%"
                maxWidth={670}
                type="centered-row"
                height={[42, 42, 42, 52]}
              >
                {!isIOSNativeApp() && !!getAssetUrl && (
                  <Box height="100%" flex={1}>
                    <Button
                      frameType="default"
                      colorType="secondary"
                      height={isTabletWide ? '52px' : '36px'}
                      text={
                        isFetching
                          ? t('play.loadingConquestPrices') +
                            ` (${fetchingCountdown}s)`
                          : `${ticketPrice} USDC`
                      }
                      leftAdornment={{
                        image: !isFetching
                          ? getAssetUrl('webapp/icons/usdc.webp')
                          : undefined
                      }}
                      disabled={isFetching || !iapSupportedRegion}
                      onClick={() => confirmClearCart(usdcClick)}
                      data-id="chooseUsdc"
                      className={Sprinkles({ width: 'full' })}
                    />
                  </Box>
                )}

                {allowsIAP && <PurchaseConquestIAPButton isFetching={isFetching} />}
                <Box height="100%" flex={1}>
                  <Button
                    frameType="default"
                    colorType={hasSilverCards ? 'secondary' : 'default'}
                    height={isTabletWide ? '52px' : '36px'}
                    text={t('play.conquestCostExplanationiOS')}
                    leftAdornment={{
                      image:
                        !isFetching && !!getAssetUrl
                          ? getAssetUrl('webapp/icons/silver-card-with-letter.webp')
                          : undefined,
                      icon: isFetching ? 'spinner' : undefined
                    }}
                    disabled={isFetching || !hasSilverCards}
                    onClick={() => confirmClearCart(silverCardsClick)}
                    data-id="chooseSilver"
                    className={Sprinkles({ width: 'full' })}
                  />
                </Box>
              </ButtonContainer>
              <Text
                fontSize={[16, 16, 16]}
                color="purple9"
                fontWeight="medium"
                pt={[16, 16, 24, 32]}
                fontFamily="condensed"
              >
                {t('play.conquestEntry')}
              </Text>
            </FlexBox>
          </FlexBox>
        </Box>
      </FlexBox>
    </>
  )
})

const ButtonContainer = styled(FlexBox)`
  gap: 8px;
`

PurchaseConquestPage.displayName = 'PurchaseConquestPage'
