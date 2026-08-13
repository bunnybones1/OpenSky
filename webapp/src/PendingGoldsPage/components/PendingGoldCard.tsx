import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '~/shared/components/Card/Card'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface PendingGoldCardProps {
  id: number
  deliverAt: string
}

export const PendingGoldCard = memo(({ id, deliverAt }: PendingGoldCardProps) => {
  const { t } = useTranslation()
  const deliveryText = useMemo(() => {
    const today = new Date()
    const deliveryDate = new Date(deliverAt)
    const msUntilDelivery = Math.ceil(
      ((deliveryDate.getTime() - today.getTime()) / 1000) * 1000
    )

    const minutesUntilDelivery = Math.floor(msUntilDelivery / 1000 / 60)

    if (minutesUntilDelivery <= 0) {
      return t('play.deliveryInProgress')
    }

    let hours = 0
    if (minutesUntilDelivery >= 60) {
      hours = Math.floor(minutesUntilDelivery / 60)
    }

    const minutes = minutesUntilDelivery % 60

    return t('play.deliveryIn', { hours, minutes })
  }, [deliverAt, t])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'column'
      })}
    >
      <Card id={id} isTiltable isOverlayEnabled />
      <Text fontSize="14px" color="warm6" fontWeight="500">
        {deliveryText}
      </Text>
    </div>
  )
})

PendingGoldCard.displayName = 'PendingGoldCard'
