import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { ItemType } from '~/lib/proto'
import { Text } from '~/shared/components/Text'
import { useCardTotals } from '~/shared/hooks/cards/useCardTotals'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useCardBalanceOverview } from '~/shared/queries/cards/useCardBalanceOverview'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { WalletInfoImage } from '../WalletInfo.css'
import { WalletInfoGrid, WalletInfoValue } from './WalletInfoTooltip.css'

export const LibraryCollectionTooltip = memo(() => {
  const cardTotals = useCardTotals()
  const { userAddress } = useSnapshot(authenticationState)
  const { t } = useTranslation()
  const { data: balanceOverview } = useCardBalanceOverview({ address: userAddress })
  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={Sprinkles({
        padding: '4px'
      })}
    >
      <Text fontSize="12px" marginBottom="8px" color="purple7">
        {t('account.LibraryCollection')}
      </Text>
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
            src={getAssetUrl('webapp/icons/base-card-with-letter.webp')}
          />
        )}
        <Text
          color={
            !balanceOverview ||
            balanceOverview.frameBalanceTotalOverview[ItemType.SW_BASE_CARDS] === 0
              ? 'purple7'
              : 'white'
          }
          fontSize="12px"
          fontWeight="600"
          className={WalletInfoValue}
        >
          {!!balanceOverview ? (
            <>
              {balanceOverview.frameBalanceTotalOverview[ItemType.SW_BASE_CARDS]}
              {'  '}
              <span className={Sprinkles({ color: 'purple8' })}>
                / {cardTotals.TOTAL}
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

LibraryCollectionTooltip.displayName = 'LibraryCollectionTooltip'
