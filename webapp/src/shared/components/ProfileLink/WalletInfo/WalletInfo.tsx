import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { ItemType } from '~/lib/proto'
import { AuthenticationClient } from '~/shared/clients'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useNavigateToItemsCards } from '~/shared/hooks/cards/useNavigateToItemsCards'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useShouldHideUSDCValue } from '~/shared/hooks/useShouldHideUSDCValue'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { LibraryCollectionTooltip } from './components/LibraryCollectionTooltip'
import { WalletInfoTooltip } from './components/WalletInfoTooltip'
import { WalletInfoImage, WalletInfoStyle, WalletInfoText } from './WalletInfo.css'

export const WalletInfo = memo(() => {
  const navigate = useNavigate()
  const { data: balances } = useConquestAndUSDCBalances(true)
  const { getAssetUrl } = useGetAssetContext()
  const { data: silverBalances } = useTokenBalances(ItemType.SW_SILVER_CARDS)
  const { data: goldBalances } = useTokenBalances(ItemType.SW_GOLD_CARDS)
  const tradableTokenBalances = balances?.conquestTicketBalance.total

  const { navigateToItemsCards } = useNavigateToItemsCards()

  const { silverCards, goldCards } = useMemo(() => {
    let _silverCards = 0
    let _goldCards = 0

    if (!!silverBalances) {
      silverBalances.forEach((balance) => {
        _silverCards = _silverCards += balance.balance
      })
    }

    if (!!goldBalances) {
      goldBalances.forEach((balance) => {
        _goldCards = _goldCards += balance.balance
      })
    }

    return { silverCards: _silverCards, goldCards: _goldCards }
  }, [goldBalances, silverBalances])

  const shouldHideUSDCBalance = useShouldHideUSDCValue()

  const onNavigate = useCallback(() => {
    const grade = silverCards > 0 ? ItemType.SW_SILVER_CARDS : ItemType.SW_GOLD_CARDS
    navigateToItemsCards({ grade })
  }, [navigateToItemsCards, silverCards])

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          top: 0,
          display: 'flex',
          alignItems: 'center',
          zIndex: 3,
          paddingTop: '4px'
        }),
        WalletInfoStyle
      )}
    >
      {!!balances && !!balances.USDCBalance && (
        <Tooltip
          placement="bottom-start"
          tooltip={<WalletInfoTooltip />}
          offsetY={28}
          offsetX={8}
        >
          <div
            onClick={(e) => {
              e.preventDefault()

              if (
                AuthenticationClient.wallet &&
                !!AuthenticationClient.wallet.contracts
              ) {
                AuthenticationClient.wallet.openWalletWindow(
                  `/wallet/coins/137/${AuthenticationClient.wallet.contracts.USDC.address}`
                )
              }
            }}
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingRight: '8px'
            })}
          >
            {!!getAssetUrl && (
              <img
                className={WalletInfoImage}
                src={getAssetUrl('webapp/icons/usdc.webp')}
              />
            )}
            <Text
              marginLeft="4px"
              fontSize="10px"
              color="white"
              className={WalletInfoText}
            >
              {shouldHideUSDCBalance ? '****' : balances.USDCBalance}
            </Text>
          </div>
        </Tooltip>
      )}
      <Tooltip
        placement="bottom-start"
        tooltip={<LibraryCollectionTooltip />}
        offsetY={28}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          {(!!silverCards || !!goldCards) && (
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px'
              })}
              onClick={onNavigate}
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
          )}
        </div>
      </Tooltip>
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        {!!tradableTokenBalances && tradableTokenBalances > 0 && (
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '8px'
            })}
            onClick={(e) => {
              e.preventDefault()
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
              {tradableTokenBalances}
            </Text>
          </div>
        )}
      </div>
    </div>
  )
})

WalletInfo.displayName = 'WalletInfo'
