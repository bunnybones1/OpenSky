import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { derivedHeroFeatureState } from '~/HeroFeaturePage/shared/state'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useMintHeroesTotal } from '../shared/hooks/useMintHeroesTotal'
import { TooltipStyle } from './MintHerosModalTotal.css'

export const MintHeroesModalTotal = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { totalSkinsInOrder } = useSnapshot(derivedHeroFeatureState)
  const { selectedCards } = useSnapshot(selectGoldsState)
  const { t } = useTranslation()

  const { total, totalGoldReduction } = useMintHeroesTotal(selectedCards)

  const numGoldsSelected = useMemo(() => {
    let count = 0
    // eslint-disable-next-line valtio/state-snapshot-rule
    selectedCards.forEach((card) => {
      count = count + card.amount
    })

    return count
  }, [selectedCards])

  const TotalCostSection = useMemo(() => {
    if (env.AUTH_MODE === 'google') {
      return (
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingY: { base: '8px', tablet: '0px' }
          })}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              width: 'full',
              justifyContent: 'flex-end',
              alignItems: 'center'
            })}
          >
            <Tooltip
              placement="top-start"
              tooltip={t('heroFeature.offchainExchangeExplanation')}
              tooltipClassName={TooltipStyle}
            >
              <Icon
                type="info-empty"
                height="14px"
                color="purple9"
                marginRight="4px"
              />
            </Tooltip>
            <Text
              color="purple9"
              fontWeight={'600'}
              fontSize={'16px'}
              marginRight="4px"
            >
              {t('heroFeature.totalSkinsInOrder', {
                total: totalSkinsInOrder
              })}
            </Text>
            <Text color="white" fontWeight={'600'} fontSize={'16px'}>
              {totalSkinsInOrder * 10} Gold
            </Text>
          </div>
          <Text color="purple8" fontWeight={'600'} fontSize={'12px'}>
            {numGoldsSelected} Gold selected
          </Text>
        </div>
      )
    }
    return (
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingY: { base: '8px', tablet: '0px' }
        })}
      >
        {!!totalGoldReduction.value && (
          <div
            className={Sprinkles({
              display: 'flex',
              width: 'full',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '4px'
            })}
          >
            {!!total ? (
              <Text color="purple8" fontWeight={'600'} fontSize={'12px'}>
                {`${formatUSDCBalance(total)}USDC - ${formatUSDCBalance(
                  totalGoldReduction.value
                )}USDC`}
              </Text>
            ) : (
              <Icon type="spinner" height="12px" color="white" />
            )}

            <Text
              color="purple8"
              fontWeight={'600'}
              fontSize={'12px'}
              className={Sprinkles({ marginLeft: '4px' })}
            >
              {'('}
            </Text>
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/gold-card-with-letter.webp')}
                style={{
                  height: '12px',
                  width: 'auto'
                }}
              />
            )}
            <Text color="white" fontWeight={'600'} fontSize={'12px'}>
              {`${numGoldsSelected} golds`}
            </Text>
            <Text color="purple8" fontWeight={'600'} fontSize={'12px'}>
              {')'}
            </Text>
          </div>
        )}
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            justifyContent: 'flex-end',
            alignItems: 'center'
          })}
        >
          <Tooltip
            placement="top-start"
            tooltip={t('shop.mintHeroExplanation')}
            tooltipClassName={TooltipStyle}
          >
            <Icon type="info-empty" height="14px" color="purple9" marginRight="4px" />
          </Tooltip>
          <Text
            color="purple9"
            fontWeight={'600'}
            fontSize={'16px'}
            marginRight="4px"
          >
            {t('heroFeature.totalSkinsInOrder', {
              total: totalSkinsInOrder
            })}
          </Text>
          {!!total ? (
            <Text color="white" fontWeight={'600'} fontSize={'16px'}>
              {`$${
                !!totalGoldReduction.value
                  ? (
                      formatUSDCBalance(total) -
                      formatUSDCBalance(totalGoldReduction.value)
                    ).toFixed(2)
                  : formatUSDCBalance(total)
              }`}
            </Text>
          ) : (
            <div
              className={Sprinkles({
                display: 'flex',
                marginLeft: '4px'
              })}
            >
              <Icon color="white" type="spinner" height="16px" />
            </div>
          )}
        </div>
      </div>
    )
  }, [
    getAssetUrl,
    numGoldsSelected,
    t,
    total,
    totalGoldReduction.value,
    totalSkinsInOrder
  ])

  return (
    <>
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          justifyContent: 'flex-start',
          alignItems: 'center'
        })}
      >
        <Tooltip
          placement="top-start"
          tooltip={
            env.AUTH_MODE === 'google'
              ? t('heroFeature.offchainExchangeExplanation')
              : `${t('shop.tradableNature')} ${t('shop.noRefunds')}`
          }
          tooltipClassName={TooltipStyle}
        >
          <Icon type="info-empty" height="14px" color="purple9" />
        </Tooltip>
        <Text
          color="purple9"
          fontWeight={'600'}
          fontSize={'14px'}
          className={Sprinkles({ marginLeft: '4px' })}
        >
          {env.AUTH_MODE === 'google'
            ? t('heroFeature.offchainExchangeFinal')
            : t('shop.salesAreFinal')}
        </Text>
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          justifyContent: 'flex-end',
          alignItems: 'center'
        })}
      >
        {TotalCostSection}
      </div>
    </>
  )
})

MintHeroesModalTotal.displayName = 'MintHeroesModalTotal'
