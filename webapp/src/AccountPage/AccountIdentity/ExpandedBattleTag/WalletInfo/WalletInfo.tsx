import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Clipboard from 'react-clipboard.js'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/__deprecated__/Text'
import { ItemType } from '~/lib/proto'
import { AuthenticationClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Grid } from '~/shared/components/Base/Grid'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { CONVERT_TO_SEQUENCE_WALLET_DIALOG } from '~/shared/constants/ui'
import { useCardTotals } from '~/shared/hooks/cards/useCardTotals'
import { useNavigateToItemsCards } from '~/shared/hooks/cards/useNavigateToItemsCards'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useShouldHideUSDCValue } from '~/shared/hooks/useShouldHideUSDCValue'
import { useCardBalanceOverview } from '~/shared/queries/cards/useCardBalanceOverview'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import BaseCardTooltip from './components/BaseCardTooltip'
import { BlockchainDescriptionDialog } from './components/BlockchainDescriptionDialog'
import ConquestTicketTooltip from './components/ConquestTicketTooltip'
import GoldCardTooltip from './components/GoldCardTooltip'
import SilverCardTooltip from './components/SilverCardTooltip'
import { useWalletCardValues } from './hooks/useWalletCardValues'

const { openDialog: openConvertDialog } = controlDialog(
  CONVERT_TO_SEQUENCE_WALLET_DIALOG
)

const WalletInfo = memo(() => {
  const { data: walletValues } = useWalletCardValues()
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const cardTotals = useCardTotals()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { userAddress } = useSnapshot(authenticationState)

  const { data: activeAccount } = useActiveAccount()

  const activeAddress = activeAccount?.address
  const isExternalAccount =
    !!userAddress && !!activeAddress && userAddress !== activeAddress

  const isBurnerAccount = !isExternalAccount && !!activeAccount?.isBurnerWallet

  const { data: conquestAndUSDCBalance } = useConquestAndUSDCBalances(
    !isExternalAccount
  )

  const totalConquestTicketBalance =
    conquestAndUSDCBalance?.conquestTicketBalance.total

  const hasConquestTickets = useMemo(() => {
    if (!!totalConquestTicketBalance && totalConquestTicketBalance > 0) {
      return true
    }
    return false
  }, [totalConquestTicketBalance])

  const { data: balanceOverview } = useCardBalanceOverview({ address: activeAddress })

  let copiedTimeout: number | undefined
  const [copied, updateCopied] = useState(false)

  const { navigateToItemsCards } = useNavigateToItemsCards()

  const handleCopySuccess = () => {
    updateCopied(true)
    clearTimeout(copiedTimeout)
    copiedTimeout = window.setTimeout(() => {
      updateCopied(false)
    }, 2000)
  }

  const [trimActiveAddress, setTrimActiveAddress] = useState('')
  const silverCardsButton = useRef<HTMLDivElement>(null)
  const goldCardsButton = useRef<HTMLDivElement>(null)
  const baseCardsButton = useRef<HTMLDivElement>(null)
  const USDCCoinsButton = useRef<HTMLDivElement>(null)
  const backupButton = useRef<HTMLDivElement>(null)
  const shouldHideUSDCBalance = useShouldHideUSDCValue()

  const { Dialog, openDialog } = useDialog({
    Element: BlockchainDescriptionDialog,
    id: 'BLOCKCHAIN_DESCRIPTION_DIALOG'
  })

  const onTradableItemsClick = useCallback(() => openDialog(), [openDialog])

  useEffect(() => {
    let cutPoint = 32
    if (!isTabletWide) {
      cutPoint = 15
    }
    if (!!activeAddress) {
      const startTrim = activeAddress.substr(0, cutPoint)
      const endTrim = activeAddress.substr(
        activeAddress.length - 4,
        activeAddress.length
      )
      setTrimActiveAddress(startTrim + '...' + endTrim)
    }
  }, [activeAddress, isTabletWide])

  const handleClick = (e) => {
    if (silverCardsButton.current && silverCardsButton.current.contains(e.target))
      return
    if (USDCCoinsButton.current && USDCCoinsButton.current.contains(e.target)) return
    if (baseCardsButton.current && baseCardsButton.current.contains(e.target)) return
    if (backupButton.current && backupButton.current.contains(e.target)) return

    AuthenticationClient.wallet?.openWalletWindow()
  }

  const usdcValue = useMemo(() => {
    return conquestAndUSDCBalance && conquestAndUSDCBalance.USDCBalance
      ? shouldHideUSDCBalance
        ? '****'
        : conquestAndUSDCBalance.USDCBalance
      : 0
  }, [conquestAndUSDCBalance, shouldHideUSDCBalance])

  const totalCardValue = (itemType: ItemType) => {
    if (isExternalAccount) {
      return '***'
    } else if (shouldHideUSDCBalance && !isExternalAccount) {
      return '$***'
    } else if (!shouldHideUSDCBalance && !isExternalAccount) {
      if (itemType === ItemType.SW_SILVER_CARDS && !!walletValues?.silverValue)
        return `$${walletValues.silverValue}`
      if (itemType === ItemType.SW_GOLD_CARDS && !!walletValues?.goldValue)
        return `$${walletValues.goldValue}`
    }
    return '$***'
  }

  const totalPortfolioValue: string = useMemo(() => {
    if (isExternalAccount) {
      return '$***'
    }
    if (shouldHideUSDCBalance && !isExternalAccount) {
      return '$***'
    }

    const combinedCardValue =
      Number(walletValues?.silverValue || 0) + Number(walletValues?.goldValue || 0)

    return `$` + ((usdcValue as number) + combinedCardValue).toFixed(2)
  }, [walletValues, isExternalAccount, shouldHideUSDCBalance, usdcValue])

  const ClipboardComponent = () => (
    <Clipboard
      style={{
        background: 'none',
        border: 'none',
        outline: 'none',
        gridArea: 'address',
        justifySelf: 'flex-end',
        marginLeft: 'auto',
        marginRight: '8px'
      }}
      data-clipboard-text={activeAddress}
      onSuccess={handleCopySuccess}
    >
      <FlexBox
        style={{
          fontSize: '12px',
          color: '#705BAB',
          cursor: copied ? 'unset' : 'pointer'
        }}
      >
        <Icon
          type="copy"
          color="purple7"
          height="12px"
          style={{ marginRight: '4px' }}
        />
        {copied ? t('profile.addressCopied') : trimActiveAddress}
      </FlexBox>
    </Clipboard>
  )

  const WalletButton = () => (
    <FlexBox
      type="centered-row"
      style={{
        gridArea: 'button'
      }}
    >
      <SequenceButton ml={2} onClick={isExternalAccount ? undefined : handleClick}>
        <Box mr={'2px'}>
          <ImageIcon height="14px" type="sequence" />
        </Box>
        <FlexBox position="relative" top="-1px">
          Sequence Wallet
        </FlexBox>
        <Icon
          type="external"
          color="white"
          height="12px"
          style={{ marginRight: '5px' }}
        />
      </SequenceButton>
    </FlexBox>
  )

  return (
    <>
      <StyledWalletInfo
        type="centered-start-column"
        width="100%"
        bg="purple1"
        borderTop="1px solid"
        borderBottom={
          !isExternalAccount && !!activeAccount?.isBurnerWallet
            ? undefined
            : '1px solid'
        }
        borderColor="purple6"
        mt={'16px'}
        className={clsx({ isUserProfile: !isExternalAccount })}
      >
        <Grid
          width="100%"
          gridTemplateColumns={
            isExternalAccount
              ? '1fr 1fr 1fr'
              : [
                  '1fr 1fr 1fr',
                  '1fr 1fr 1fr',
                  hasConquestTickets ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr'
                ]
          }
        >
          {
            <>
              <Tooltip placement="top" tooltip={<BaseCardTooltip />}>
                <WalletCurrencyInfo
                  ref={baseCardsButton}
                  className={clsx({ isExternalAccount })}
                  onClick={
                    isExternalAccount
                      ? undefined
                      : () => {
                          navigateToItemsCards({ grade: ItemType.SW_BASE_CARDS })
                        }
                  }
                >
                  <WalletCurrencyInfoDetails>
                    {!!getAssetUrl && (
                      <img
                        src={getAssetUrl('webapp/icons/base-card-with-letter.webp')}
                      />
                    )}
                    <div className="walletCurrencyAmount">
                      <CurrencyValue>
                        {!!balanceOverview
                          ? balanceOverview.frameBalanceOverview[
                              ItemType.SW_BASE_CARDS
                            ].owned
                          : '?'}
                        <TotalCardsText>/{cardTotals.TOTAL}</TotalCardsText>
                      </CurrencyValue>

                      <CurrencyDescription>
                        {t('profile.baseCards')}
                      </CurrencyDescription>
                    </div>
                  </WalletCurrencyInfoDetails>
                  <StyledWalletCurrencySubInfo>
                    {t('profile.nonTradable')}
                  </StyledWalletCurrencySubInfo>
                </WalletCurrencyInfo>
              </Tooltip>
              <Tooltip placement="top" tooltip={<SilverCardTooltip />}>
                <WalletCurrencyInfo
                  ref={silverCardsButton}
                  className={clsx({ isExternalAccount })}
                  onClick={
                    isExternalAccount
                      ? undefined
                      : () => {
                          navigateToItemsCards({ grade: ItemType.SW_SILVER_CARDS })
                        }
                  }
                >
                  <WalletCurrencyInfoDetails>
                    {!!getAssetUrl && (
                      <img
                        src={getAssetUrl('webapp/icons/silver-card-with-letter.webp')}
                      />
                    )}

                    <div className="walletCurrencyAmount">
                      <CurrencyValue>
                        {!!balanceOverview ? (
                          <>
                            {
                              balanceOverview.frameBalanceTotalOverview[
                                ItemType.SW_SILVER_CARDS
                              ]
                            }
                            {'  '}
                            <Text
                              color="purple8"
                              fontSize="13px"
                              fontWeight="500"
                              style={{ display: 'inline-block' }}
                            >
                              (
                              {
                                balanceOverview.frameBalanceOverview[
                                  ItemType.SW_SILVER_CARDS
                                ].owned
                              }{' '}
                              {t('profile.uniq')})
                            </Text>{' '}
                          </>
                        ) : (
                          '?'
                        )}
                      </CurrencyValue>

                      <CurrencyDescription>
                        {t('profile.silverCards')}
                      </CurrencyDescription>
                    </div>
                  </WalletCurrencyInfoDetails>

                  <StyledWalletCurrencySubInfo
                    highlight={!!walletValues?.silverValue && !isExternalAccount}
                  >
                    {totalCardValue(ItemType.SW_SILVER_CARDS)}
                  </StyledWalletCurrencySubInfo>
                </WalletCurrencyInfo>
              </Tooltip>

              <Tooltip placement="top" tooltip={<GoldCardTooltip />}>
                <WalletCurrencyInfo
                  ref={goldCardsButton}
                  className={clsx({ isExternalAccount })}
                  onClick={
                    isExternalAccount
                      ? undefined
                      : () => {
                          navigateToItemsCards({ grade: ItemType.SW_GOLD_CARDS })
                        }
                  }
                >
                  <WalletCurrencyInfoDetails>
                    {!!getAssetUrl && (
                      <img
                        src={getAssetUrl('webapp/icons/gold-card-with-letter.webp')}
                      />
                    )}

                    <div className="walletCurrencyAmount">
                      <CurrencyValue>
                        {!!balanceOverview ? (
                          <>
                            {
                              balanceOverview.frameBalanceTotalOverview[
                                ItemType.SW_GOLD_CARDS
                              ]
                            }
                            {'  '}
                            <Text
                              color="purple8"
                              fontSize="13px"
                              fontWeight="500"
                              style={{ display: 'inline-block' }}
                            >
                              (
                              {
                                balanceOverview.frameBalanceOverview[
                                  ItemType.SW_GOLD_CARDS
                                ].owned
                              }{' '}
                              {t('profile.uniq')})
                            </Text>{' '}
                          </>
                        ) : (
                          '?'
                        )}
                      </CurrencyValue>

                      <CurrencyDescription>
                        {t('profile.goldCards')}
                      </CurrencyDescription>
                    </div>
                  </WalletCurrencyInfoDetails>
                  <StyledWalletCurrencySubInfo
                    highlight={!!walletValues?.goldValue && !isExternalAccount}
                  >
                    {totalCardValue(ItemType.SW_GOLD_CARDS)}
                  </StyledWalletCurrencySubInfo>
                </WalletCurrencyInfo>
              </Tooltip>
            </>
          }
          {!isExternalAccount && (
            <>
              {hasConquestTickets && (
                <Tooltip placement="top" tooltip={<ConquestTicketTooltip />}>
                  <WalletCurrencyInfo>
                    <WalletCurrencyInfoDetails>
                      {!!getAssetUrl && (
                        <img src={getAssetUrl('webapp/icons/conquest-ticket.webp')} />
                      )}
                      <div className="walletCurrencyAmount">
                        <CurrencyValue>
                          {conquestAndUSDCBalance?.conquestTicketBalance.total
                            ? conquestAndUSDCBalance.conquestTicketBalance.total
                            : 0}
                        </CurrencyValue>

                        <CurrencyDescription>
                          {t('profile.tickets')}
                        </CurrencyDescription>
                      </div>
                    </WalletCurrencyInfoDetails>
                    <StyledWalletCurrencySubInfo>
                      {t('profile.nonTradable')}
                    </StyledWalletCurrencySubInfo>
                  </WalletCurrencyInfo>
                </Tooltip>
              )}
              <WalletCurrencyInfo
                ref={USDCCoinsButton}
                borderRight={['1px solid #4d3c7b', '1px solid #4d3c7b', 'none']}
                onClick={() => {
                  AuthenticationClient.wallet?.openWalletWindow('/wallet')
                }}
              >
                <WalletCurrencyInfoDetails>
                  {!!getAssetUrl && (
                    <img src={getAssetUrl('webapp/icons/usdc.webp')} />
                  )}
                  <div className="walletCurrencyAmount">
                    <CurrencyValue>{usdcValue}</CurrencyValue>

                    <CurrencyDescription>
                      {t('profile.usdcpolygon')}
                    </CurrencyDescription>
                  </div>
                </WalletCurrencyInfoDetails>
                <StyledWalletCurrencySubInfo
                  highlight={typeof usdcValue === 'number' && usdcValue > 0}
                >
                  ${usdcValue}
                </StyledWalletCurrencySubInfo>
              </WalletCurrencyInfo>
            </>
          )}
        </Grid>

        {!isExternalAccount && (
          <>
            <WalletSectionHeader>
              <FlexBox style={{ alignItems: 'center', width: '100%' }}>
                <WalletSectionHeaderTitle>
                  {t('profile.WALLET')}
                </WalletSectionHeaderTitle>
                {!activeAccount?.isBurnerWallet && <WalletButton />}
                <ClipboardComponent />
              </FlexBox>
            </WalletSectionHeader>
            <div
              className={Sprinkles({
                width: 'full',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                alignItems: isBurnerAccount ? 'flex-start' : 'center',
                paddingX: isBurnerAccount ? '16px' : undefined,
                justifyContent: 'center',
                backgroundColor: 'purple2',
                borderBottom: '1px solid',
                borderColor: 'purple6'
              })}
            >
              <FlexBox
                justifyContent={isBurnerAccount ? 'flex-start' : 'center'}
                alignItems="center"
                backgroundColor="#170D30"
                pt={16}
                pb={8}
              >
                <Text color="purple8" fontSize={['14px', '16px', '16px', '20px']}>
                  {t('profile.totalItemBalance')}
                </Text>
                <Text color="white" fontSize={['14px', '16px', '16px', '20px']}>
                  &nbsp;
                  {totalPortfolioValue}
                </Text>
              </FlexBox>
              <FlexBox
                style={{
                  fontSize: '12px',
                  flexDirection: 'row',
                  color: '#AC8FFF',
                  backgroundColor: '#170D30',
                  paddingBottom: '16px'
                }}
                justifyContent={isBurnerAccount ? 'flex-start' : 'center'}
                alignItems="center"
                paddingRight={isBurnerAccount ? '180px' : '0px'}
              >
                <TradableItems
                  style={{ display: 'inline-block' }}
                  onClick={isBurnerAccount ? undefined : onTradableItemsClick}
                  className={clsx({ isBurnerAccount })}
                >
                  <Icon
                    type="info-empty"
                    color="purple8"
                    height="12px"
                    style={{ marginRight: '5px', display: 'inline-block' }}
                  />
                  {isBurnerAccount
                    ? t('profile.protectAccountDesc')
                    : t('profile.tradableItemsTip')}
                </TradableItems>
              </FlexBox>
              {!!isBurnerAccount && (
                <div
                  className={Sprinkles({
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    zIndex: 2,
                    paddingRight: '16px',
                    paddingTop: '16px'
                  })}
                >
                  <Button
                    onClick={openConvertDialog}
                    colorType="blue"
                    frameType="default"
                    height="36px"
                    text={t('profile.protectAccount')}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </StyledWalletInfo>
      {Dialog}
    </>
  )
})

WalletInfo.displayName = 'WalletInfo'

const StyledWalletCurrencySubInfo = styled(FlexBox)<{
  highlight?: boolean
}>`
  background: ${({ theme }) => theme.colors.purple1};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  border-bottom: 1px solid ${({ theme }) => theme.colors.purple6};
  color: ${({ theme }) => theme.colors.purple8};
  padding: 8px 12px;
  font-size: 13px;
  width: 100%;
  ${(props) => (props.highlight ? `color: white` : '')}
`

const StyledWalletInfo = styled(FlexBox)`
  display: block;
  &.isUserProfile {
    &:hover {
      .infoRow {
        background-color: ${({ theme }) => theme.colors.purple5};
      }
    }
  }
`

const SequenceButton = styled(FlexBox)`
  background: ${({ theme }) => theme.colors.purple6};
  height: 25px;
  width: 140px;
  border-radius: 4px;
  display: grid;
  grid-template-columns: 24px 1fr 20px;
  color: white;
  font-size: 12px;
  align-items: center;
  padding-left: 5px;
`

const TotalCardsText = styled(Text)`
  display: inline-block;
  color: ${({ theme }) => theme.colors.purple6};
  font-weight: 400;
  font-size: 16px;
  line-height: 16px;
  vertical-align: unset;
  overflow: unset;
`

const WalletCurrencyInfoDetails = styled(FlexBox)`
  display: flex;
  width: 100%;
  height: 100%;
  height: 54px;
  background: linear-gradient(180deg, #1c1038 57.43%, #000000 100%);
  img {
    width: 28px;
    height: 28px;
    top: 12px;
    position: relative;
    left: 8px;
  }
  ${(props) => props.theme.mediaQueries.mobile} {
    .walletCurrencyAmount {
      padding-left: 12px;
    }
  }
`

const WalletCurrencyInfo = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  border-right: 1px solid ${({ theme }) => theme.colors.purple6};
  width: 100%;

  .walletCurrencyAmount {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    width: auto;
    height: 100%;
    padding-left: 14px;
  }
  &:hover:not(.isExternalAccount) {
    .sequence-platforms-text {
      color: ${({ theme }) => theme.colors.purple9};
    }
  }
`

const CurrencyValue = styled(Text)`
  font-weight: 400;
  font-size: 16px;
  line-height: 16px;
  color: white;
`

const TradableItems = styled(Box)`
  &:hover:not(.isBurnerAccount) {
    color: white;
  }
`

const CurrencyDescription = styled(Text)`
  font-size: 12px;
  line-height: 14px;
  color: ${({ theme }) => theme.colors.purple8};
  font-weight: 500;
`
const WalletSectionHeader = styled(FlexBox)`
  height: 52px;
  width: 100%;
  background: ${({ theme }) => theme.colors.purple4};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  border-bottom: 1px solid ${({ theme }) => theme.colors.purple6};
  align-items: center;
  margin-top: 16px;
  justify-content: space-between;
`

const WalletSectionHeaderTitle = styled(FlexBox)`
  font-family: 'Barlow Condensed';
  font-weight: 500;
  font-size: 26px;
  color: ${({ theme }) => theme.colors.purple9};
  margin-left: 12px;
`

export default WalletInfo
