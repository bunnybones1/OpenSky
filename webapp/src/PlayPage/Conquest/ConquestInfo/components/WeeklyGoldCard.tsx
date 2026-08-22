import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import env from '~/env'
import { Card } from '~/shared/components/Card/Card'
import { CardBalance } from '~/shared/components/CardBalanceInfo'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { makeItemsCardDetailsRoute } from '~/shared/helpers/routes/items-page'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface WeeklyGoldCardProps {
  id: number
  collectedAmount: number
}

export const WeeklyGoldCard = memo(({ id, collectedAmount }: WeeklyGoldCardProps) => {
  const { t } = useTranslation()
  const isOffchain = env.AUTH_MODE === 'google'
  return (
    <Link
      className={Sprinkles({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: 'full'
      })}
      to={makeItemsCardDetailsRoute(id)}
    >
      <Card id={id} BalanceAndPriceInfo={CardBalance} isTiltable isOverlayEnabled />
      <div
        style={{
          paddingTop: '60px'
        }}
      >
        <Tooltip
          placement="top"
          tooltip={t(
            isOffchain
              ? 'play.conquestWeeklyGoldsOffchain'
              : 'play.conquestWeeklyGolds'
          )}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <Icon type="info-empty" height="12px" color="purple7" />
            <Text marginLeft="4px" color="purple7" fontSize="14px" fontWeight="500">
              {`${collectedAmount} ${t(
                isOffchain ? 'generic.Collected' : 'generic.Minted'
              )}`}
            </Text>
          </div>
        </Tooltip>
      </div>
    </Link>
  )
})

WeeklyGoldCard.displayName = 'WeeklyGoldCard'
