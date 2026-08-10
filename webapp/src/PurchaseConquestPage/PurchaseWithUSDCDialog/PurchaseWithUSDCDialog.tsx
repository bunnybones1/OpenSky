import { isNativeOpenSkyMobileApp } from '@opensky/shared/native'
import clsx from 'clsx'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from 'react-use'

import { AuthenticationClient } from '~/shared/clients'
import { Asset } from '~/shared/components/Asset'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { CONQUEST_TICKET_UNIT_PRICE } from '~/shared/constants/market'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { useConquestTicketCost } from '~/shared/queries/useConquestTicketCost'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import TicketQuantityRow from './components/TicketQuantityRow'
import { useProcessConquestUSDCOrder } from './hooks/useProcessConquestUSDCOrder'
import {
  PurchaseWithUSDCDialogArrow,
  PurchaseWithUSDCDialogHeader,
  PurchaseWithUSDCDialogStyle,
  PurchaseWithUSDCDialogTooltip
} from './PurchaseWithUSDCDialog.css'
import { PURCHASE_WITH_USDC_DIALOG_ID } from './shared/constants'
import { ConquestOrderType } from './shared/types'

const { closeDialog } = controlDialog(PURCHASE_WITH_USDC_DIALOG_ID)

const FontSizeText = { base: '12px', tabletWide: '16px' } as const

export const PurchaseWithUSDCDialog = memo(() => {
  const navigate = useNavigate()
  const { getAssetUrl } = useGetAssetContext()
  const [numTickets, changeNumTickets] = useState(5)
  const [isProcessingOrder, changeProcessingOrder] = useState(false)

  const { data: balances } = useConquestAndUSDCBalances(true)
  const { data: price, isLoading } = useConquestTicketCost(numTickets)
  const { processConquestUSDCOrder } = useProcessConquestUSDCOrder()

  const totalCost = useMemo(() => {
    return price ? formatUSDCBalance(price) : CONQUEST_TICKET_UNIT_PRICE * numTickets
  }, [price, numTickets])

  const unitPrice = useMemo(() => {
    return numTickets > 0 ? (totalCost / numTickets).toFixed(2) : '0'
  }, [totalCost, numTickets])

  const hasEnoughUSDC = useMemo(() => {
    return !!balances && balances.USDCBalance >= totalCost
  }, [balances, totalCost])

  const processOrder = useCallback(async () => {
    changeProcessingOrder(true)
    // We are buying silvers if price is below USDC price,
    // else we are just using straight up USDC
    const success = await processConquestUSDCOrder(
      numTickets,
      Number(unitPrice) < CONQUEST_TICKET_UNIT_PRICE
        ? ConquestOrderType.MARKET_BUY
        : ConquestOrderType.USDC
    )
    if (success) {
      navigate(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath)
    }
    changeProcessingOrder(false)
    closeDialog()
  }, [processConquestUSDCOrder, numTickets, unitPrice, navigate])

  useMount(() => {
    if (!!balances && balances.USDCBalance < 5) {
      changeNumTickets(1)
    }
  })

  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'purple1'
        }),
        PurchaseWithUSDCDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            backgroundColor: 'purple3',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            width: 'full'
          }),
          PurchaseWithUSDCDialogHeader
        )}
      >
        <TitleDetail rightDisabled title={t('generic.buyTicketsWithUSDC')} />
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          width: 'full',
          backgroundColor: 'purple1',
          position: 'relative',
          flex: 1
        })}
      >
        <TicketQuantityRow
          numTickets={numTickets}
          changeNumTickets={changeNumTickets}
          unitPrice={unitPrice}
          totalPrice={totalCost.toFixed(2)}
          isLoading={isLoading}
        />
        {!isLoading &&
          Number(unitPrice) < CONQUEST_TICKET_UNIT_PRICE &&
          numTickets !== 0 && (
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                borderColor: 'purple5',
                border: '1px solid',
                backgroundColor: 'purple2',
                width: 'full',
                paddingY: '12px',
                paddingX: '20px'
              })}
            >
              <div className={Sprinkles({ display: 'flex', alignItems: 'center' })}>
                <Text
                  fontSize={FontSizeText}
                  color="purple9"
                  className={Sprinkles({ paddingLeft: '4px' })}
                >
                  {t('tooltip.silverSavingsLineOne')}{' '}
                  {t('tooltip.silverSavingsLineTwo')}
                </Text>
              </div>
            </div>
          )}
        {!hasEnoughUSDC && !isNativeOpenSkyMobileApp() && false && (
          <div
            className={Sprinkles({
              display: 'flex',
              justifyContent: 'center',
              width: 'full',
              height: 'full',
              backgroundColor: 'purple1',
              position: 'absolute',
              paddingLeft: '48px',
              top: 0,
              left: 0,
              zIndex: 2
            })}
          >
            <Icon
              type="arrow-left-up"
              height="32px"
              color="white"
              className={PurchaseWithUSDCDialogArrow}
            />
            <Text
              fontSize="18px"
              color="white"
              fontWeight={'600'}
              className={Sprinkles({ paddingLeft: '4px' })}
            >
              {t('shop.notEnough')}
            </Text>
          </div>
        )}
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'full',
          padding: { base: '8px', tabletWide: '16px' },
          borderColor: 'purple7',
          borderTop: '1px solid',
          backgroundColor: 'purple3'
        })}
      >
        <Tooltip
          placement="top"
          tooltip={
            <div
              className={clsx(
                Sprinkles({
                  display: 'grid',
                  alignItems: 'center',
                  paddingX: '12px',
                  paddingY: '4px'
                }),
                PurchaseWithUSDCDialogTooltip
              )}
            >
              <Text color="purple8">{t('shop.tradableNature')}</Text>
              <Text color="purple8">{t('shop.noRefunds')}</Text>
            </div>
          }
        >
          <div className={Sprinkles({ display: 'flex', alignItems: 'center' })}>
            <Icon
              type="info"
              height="20px"
              color="purple9"
              marginLeft="8px"
              marginRight="8px"
            />
            <Text
              fontSize={FontSizeText}
              color="purple9"
              fontFamily="condensed"
              fontWeight={'400'}
              className={Sprinkles({ marginRight: '4px' })}
            >
              {t('shop.notEnough')}
            </Text>
          </div>
        </Tooltip>
        <div
          className={Sprinkles({
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          })}
        >
          <Text
            fontSize={FontSizeText}
            color="white"
            fontWeight={'400'}
            className={Sprinkles({ paddingRight: '4px' })}
          >
            {t('generic.total')}:
          </Text>
          <Asset url="webapp/icons/usdc.webp" style={{ width: 16, height: 16 }} />
          {isLoading && (
            <Icon
              height="16px"
              marginLeft="12px"
              marginRight="8px"
              color="white"
              type="spinner"
            />
          )}
          <Text
            fontSize={FontSizeText}
            color="white"
            fontWeight={'600'}
            className={Sprinkles({ paddingLeft: '4px' })}
          >
            {isLoading ? '' : totalCost}
          </Text>
        </div>
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          justifyContent: 'center',
          borderColor: 'purple7',
          borderTop: '1px solid',
          backgroundColor: 'purple1',
          width: 'full',
          padding: '12px'
        })}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 'auto'
          })}
        >
          {!isNativeOpenSkyMobileApp() && false && (
            <Button
              colorType={!hasEnoughUSDC ? 'blue' : 'default'}
              frameType="default"
              onClick={() => {
                if (AuthenticationClient.wallet) {
                  AuthenticationClient.wallet.openWalletWindow('/wallet/buy')
                }
              }}
              text={t('shop.getMoreUSDC')}
            />
          )}
          <div
            className={Sprinkles({
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingLeft: '12px'
            })}
          >
            <Text
              fontSize="16px"
              color="white"
              fontWeight={'400'}
              className={Sprinkles({ paddingRight: '4px' })}
            >
              {t('shop.currentBalance')}:
            </Text>
            <Asset url="webapp/icons/usdc.webp" style={{ width: 16, height: 16 }} />
            <Text
              fontSize="16px"
              color="white"
              fontWeight={'400'}
              className={Sprinkles({ paddingLeft: '4px' })}
            >
              {!balances ? '...' : balances.USDCBalance}
            </Text>
          </div>
        </div>
        <Button
          colorType="blue"
          frameType="default"
          disabled={
            numTickets === 0 ||
            isProcessingOrder ||
            !balances ||
            !hasEnoughUSDC ||
            isLoading
          }
          onClick={processOrder}
          data-id="processOrder"
          text={
            isProcessingOrder
              ? t('shop.processing')
              : `${t('shop.purchase')} ${numTickets}`
          }
          rightAdornment={
            isProcessingOrder || !getAssetUrl
              ? { icon: 'spinner' }
              : { image: getAssetUrl('webapp/icons/conquest-ticket.webp') }
          }
        />
      </div>
    </div>
  )
})

PurchaseWithUSDCDialog.displayName = 'PurchaseWithUSDCDialog'
