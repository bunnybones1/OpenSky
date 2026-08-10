import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { SoundClient } from '~/shared/clients'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  PurchaseConquestTicketsButtonBalance,
  PurchaseConquestTicketsButtonImage,
  PurchaseConquestTicketsButtonStyle,
  PurchaseConquestTicketsButtonTicketsWrapper
} from './PurchaseConquestTicketsButton.css'

export const PurchaseConquestTicketsButton = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  const { data: tokenBalances } = useConquestAndUSDCBalances(true)
  const tradableTokenBalances = tokenBalances?.conquestTicketBalance.tradable
  const totalConquestTicketBalance = tokenBalances?.conquestTicketBalance.total

  const dispatch = useDispatch()

  const onClick = useCallback(() => {
    SoundClient.playSound('JuicySwipeStandalone')
    dispatch(push(ROUTES_CONFIG.routes.PURCHASE_CONQUEST.directPath))
  }, [dispatch])

  return (
    <div
      onClick={onClick}
      data-id="purchaseTicket"
      className={clsx(
        Sprinkles({
          position: 'absolute',
          color: 'white',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }),
        { isTicketHolder: !!totalConquestTicketBalance },
        PurchaseConquestTicketsButtonStyle
      )}
    >
      <div
        className={Sprinkles({
          display: 'inline-block',
          fontSize: '14px',
          fontWeight: '500'
        })}
      >
        {t('shop.getTickets')}
      </div>
      <div
        className={clsx(
          Sprinkles({
            display: 'inline-block',
            zIndex: 3
          }),
          PurchaseConquestTicketsButtonTicketsWrapper
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/icons/conquest-ticket-big.webp')}
            className={clsx(
              Sprinkles({
                height: 'full',
                width: 'full'
              }),
              { isTicketHolder: !!tradableTokenBalances },
              PurchaseConquestTicketsButtonImage
            )}
          />
        )}
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderColor: 'black',
              position: 'absolute',
              right: 0,
              bottom: 0,
              paddingX: '4px',
              backgroundColor: 'cold8'
            }),
            PurchaseConquestTicketsButtonBalance
          )}
        >
          <Text
            fontSize="16px"
            fontWeight="700"
            color="black"
            data-id="conquestBalance"
          >
            {totalConquestTicketBalance || 0}
          </Text>
        </div>
      </div>
    </div>
  )
})

PurchaseConquestTicketsButton.displayName = 'PurchaseConquestTicketsButton'
