import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useShouldHideUSDCValue } from '~/shared/hooks/useShouldHideUSDCValue'
import { useCardBalanceOverview } from '~/shared/queries/cards/useCardBalanceOverview'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  WalletInfoGrid,
  WalletInfoImage,
  WalletInfoValue
} from './WalletInfoTooltip.css'

export const WalletInfoTooltip = memo(() => {
  const shouldHideUUSDCBalance = useShouldHideUSDCValue()
  const { t } = useTranslation()
  const { userAddress } = useSnapshot(authenticationState)
  const { data: balances } = useConquestAndUSDCBalances()
  const { getAssetUrl } = useGetAssetContext()
  const { data: balanceOverview } = useCardBalanceOverview({ address: userAddress })

  return (
    <div
      className={Sprinkles({
        padding: '4px'
      })}
    >
      <Text fontSize="12px" marginBottom="8px" color="purple7">
        {t('generic.Wallet')}
      </Text>
      {!shouldHideUUSDCBalance && (
        <div
          className={clsx(
            Sprinkles({
              alignItems: 'center',
              marginTop: '4px',
              marginBottom: '4px',
              display: 'grid'
            }),
            WalletInfoGrid
          )}
        >
          {!!getAssetUrl && (
            <img
              className={WalletInfoImage}
              src={getAssetUrl('webapp/icons/usdc.webp')}
            />
          )}
          <Text
            color={!balances || balances.USDCBalance === 0 ? 'purple7' : 'white'}
            fontSize="12px"
            fontWeight="600"
            className={WalletInfoValue}
          >
            {!balances ? '...' : balances.USDCBalance}
          </Text>
        </div>
      )}

      <div
        className={clsx(
          Sprinkles({
            alignItems: 'center',
            marginTop: '4px',
            marginBottom: '4px',
            display: 'grid'
          }),
          WalletInfoGrid
        )}
      >
        {!!getAssetUrl && (
          <img
            className={WalletInfoImage}
            src={getAssetUrl('webapp/icons/conquest-ticket.webp')}
          />
        )}
        <Text
          color={
            !balances || balances.conquestTicketBalance.total === 0
              ? 'purple7'
              : 'white'
          }
          fontSize="12px"
          fontWeight="600"
          className={WalletInfoValue}
        >
          {`${
            !!balances?.conquestTicketBalance
              ? balances.conquestTicketBalance.total
              : 0
          } ${t('profile.tickets')}`}
        </Text>
      </div>
      <div
        className={clsx(
          Sprinkles({
            alignItems: 'center',
            marginTop: '4px',
            marginBottom: '4px',
            display: 'grid'
          }),
          WalletInfoGrid
        )}
      >
        {!!getAssetUrl && (
          <img
            className={WalletInfoImage}
            src={getAssetUrl('webapp/icons/silver-card-with-letter.webp')}
          />
        )}

        <Text
          color={
            !balanceOverview ||
            balanceOverview.frameBalanceTotalOverview[ItemType.SW_SILVER_CARDS] === 0
              ? 'purple7'
              : 'white'
          }
          fontSize="12px"
          fontWeight="600"
          className={WalletInfoValue}
        >
          {!!balanceOverview ? (
            <>
              {balanceOverview.frameBalanceTotalOverview[ItemType.SW_SILVER_CARDS]}
              {'  '}
              <span className={Sprinkles({ color: 'purple8' })}>
                (
                {balanceOverview.frameBalanceOverview[ItemType.SW_SILVER_CARDS].owned}{' '}
                {t('profile.uniq')})
              </span>
            </>
          ) : (
            '?'
          )}
        </Text>
      </div>
      <div
        className={clsx(
          Sprinkles({
            alignItems: 'center',
            marginTop: '4px',
            marginBottom: '4px',
            display: 'grid'
          }),
          WalletInfoGrid
        )}
      >
        {!!getAssetUrl && (
          <img
            className={WalletInfoImage}
            src={getAssetUrl('webapp/icons/gold-card-with-letter.webp')}
          />
        )}
        <Text
          color={
            !balanceOverview ||
            balanceOverview.frameBalanceTotalOverview[ItemType.SW_GOLD_CARDS] === 0
              ? 'purple7'
              : 'white'
          }
          fontSize="12px"
          fontWeight="600"
          className={WalletInfoValue}
        >
          {!!balanceOverview ? (
            <>
              {balanceOverview.frameBalanceTotalOverview[ItemType.SW_GOLD_CARDS]}
              {'  '}
              <span className={Sprinkles({ color: 'purple8' })}>
                ({balanceOverview.frameBalanceOverview[ItemType.SW_GOLD_CARDS].owned}{' '}
                {t('profile.uniq')})
              </span>
            </>
          ) : (
            '?'
          )}
        </Text>
      </div>
    </div>
  )
})

WalletInfoTooltip.displayName = 'WalletInfoTooltip'
