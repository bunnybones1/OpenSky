import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useNavigateToItemsCards } from '~/shared/hooks/cards/useNavigateToItemsCards'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { LibraryCollectionTooltip } from './WalletInfo/components/LibraryCollectionTooltip'
import {
  WalletInfoImage,
  WalletInfoStyle,
  WalletInfoText
} from './WalletInfo/WalletInfo.css'

export const IdentityInventoryInfo = memo(() => {
  const navigate = useNavigate()
  const { getAssetUrl } = useGetAssetContext()
  const { navigateToItemsCards } = useNavigateToItemsCards()
  const { data: balances } = useConquestAndUSDCBalances(true)
  const { data: silverBalances } = useTokenBalances(ItemType.SW_SILVER_CARDS)
  const { data: goldBalances } = useTokenBalances(ItemType.SW_GOLD_CARDS)

  const { silverCards, goldCards } = useMemo(() => {
    const total = (values?: { balance: number }[] | null) =>
      values?.reduce((sum, value) => sum + value.balance, 0) ?? 0
    return {
      silverCards: total(silverBalances),
      goldCards: total(goldBalances)
    }
  }, [goldBalances, silverBalances])

  const ticketBalance = balances?.conquestTicketBalance.total ?? 0

  return (
    <div
      className={`${Sprinkles({
        position: 'absolute',
        top: 0,
        display: 'flex',
        alignItems: 'center',
        zIndex: 3,
        paddingTop: '4px'
      })} ${WalletInfoStyle}`}
      data-id="identity-inventory-summary"
    >
      <Tooltip
        placement="bottom-start"
        tooltip={<LibraryCollectionTooltip />}
        offsetY={28}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '8px'
          })}
          onClick={(event) => {
            event.preventDefault()
            navigateToItemsCards({
              grade:
                silverCards > 0
                  ? ItemType.SW_SILVER_CARDS
                  : ItemType.SW_GOLD_CARDS
            })
          }}
        >
          {!!getAssetUrl && (
            <img
              className={WalletInfoImage}
              src={getAssetUrl(
                goldCards > 0
                  ? 'webapp/icons/silver-gold-cards.webp'
                  : 'webapp/icons/silver-cards.webp'
              )}
            />
          )}
          <Text
            marginLeft="4px"
            fontSize="10px"
            color="white"
            className={WalletInfoText}
          >
            {silverCards + goldCards}
          </Text>
        </div>
      </Tooltip>
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '8px'
        })}
        onClick={(event) => {
          event.preventDefault()
          navigate(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath)
        }}
      >
        {!!getAssetUrl && (
          <img
            className={WalletInfoImage}
            src={getAssetUrl('webapp/icons/conquest-ticket.webp')}
          />
        )}
        <Text
          marginLeft="4px"
          fontSize="10px"
          color="white"
          className={WalletInfoText}
        >
          {ticketBalance}
        </Text>
      </div>
    </div>
  )
})

IdentityInventoryInfo.displayName = 'IdentityInventoryInfo'
