import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BurnSilversTotalRowStyle } from './BurnSilversTotalRow.css'

const FONT_SIZE = { base: '14px', tabletWide: '16px' } as const

export const BurnSilversTotalRow = memo(() => {
  const { t } = useTranslation()
  const { selectedCards } = useSnapshot(selectSilversState)

  const totalCards = useMemo(() => {
    let count = 0

    // eslint-disable-next-line valtio/state-snapshot-rule
    selectedCards.forEach((card) => (count = count + card.quantity))

    return count
  }, [selectedCards])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          backgroundColor: 'purple4',
          borderBottom: '1px solid',
          borderTop: '1px solid',
          borderColor: 'purple6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: '16px'
        }),
        BurnSilversTotalRowStyle
      )}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text
          color="purple9"
          fontSize={FONT_SIZE}
          fontFamily="condensed"
          data-id="cartTotal"
          fontWeight="400"
          marginRight="8px"
        >
          {env.AUTH_MODE === 'google'
            ? t('play.silverExchangeFinal')
            : t('shop.salesAreFinal')}
        </Text>
        <Tooltip
          placement="top"
          tooltip={
            env.AUTH_MODE === 'google'
              ? t('play.silverExchangeFinalTooltip')
              : t('shop.salesAreFinalTooltip')
          }
        >
          <Icon type="info" height={FONT_SIZE} color="purple9" />
        </Tooltip>
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text
          fontWeight="400"
          marginRight="8px"
          fontSize={FONT_SIZE}
          color="purple9"
          fontFamily="condensed"
        >
          {t('shop.cartTotal', { count: totalCards })}
        </Text>
      </div>
    </div>
  )
})

BurnSilversTotalRow.displayName = 'BurnSilversTotalRow'
