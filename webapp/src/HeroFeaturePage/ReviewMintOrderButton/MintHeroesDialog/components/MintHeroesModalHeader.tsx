import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import env from '~/env'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const MintHeroesModalHeader = memo(() => {
  const { data: balances } = useConquestAndUSDCBalances(env.AUTH_MODE !== 'google')
  const { t } = useTranslation()

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        height: 'full',
        width: 'full',
        position: 'relative'
      })}
    >
      <TitleDetail
        left="40px"
        mobileLeft="40px"
        rightDisabled
        title={t(
          env.AUTH_MODE === 'google'
            ? 'heroFeature.offchainOrderDetailsTitle'
            : 'heroFeature.orderDetailsTitle'
        )}
      />
      <div
        className={Sprinkles({
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          position: 'absolute',
          height: 'full',
          top: 0,
          right: 0,
          paddingRight: { base: '60px', tablet: '36px' }
        })}
      >
        {env.AUTH_MODE === 'google' ? (
          <Text
            className={Sprinkles({
              paddingLeft: '4px',
              marginRight: '16px'
            })}
            color="purple8"
          >
            {t('heroFeature.offchainExchangeRate')}
          </Text>
        ) : (
          <>
            <Text className={Sprinkles({ paddingLeft: '4px' })} color="white">
              {t('shop.currentBalanceWithArg', {
                usdcBalance: !!balances ? balances.USDCBalance : '...'
              })}
            </Text>
            <Text
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '4px',
                marginRight: '16px'
              })}
              color="purple8"
              fontSize="12px"
            >
              (<Icon type="network" color="purple8" height="10px" />
              {t('generic.polygon')})
            </Text>
          </>
        )}
      </div>
    </div>
  )
})

MintHeroesModalHeader.displayName = 'MintHeroesModalHeader'
