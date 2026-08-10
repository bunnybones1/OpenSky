import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '~/shared/components/Card/Card'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface PendingGoldCardProps {
  id: number
  mintAt: string
}

export const PendingGoldCard = memo(({ id, mintAt }: PendingGoldCardProps) => {
  const { t } = useTranslation()
  const mintText = useMemo(() => {
    const today = new Date()
    const mintDate = new Date(mintAt)
    const msUntilMint = Math.ceil(
      ((mintDate.getTime() - today.getTime()) / 1000) * 1000
    )

    const minutesUntilMint = Math.floor(msUntilMint / 1000 / 60)

    if (minutesUntilMint < -4) {
      return t('shop.MintingInProg')
    }

    if (minutesUntilMint <= 0) {
      return t('shop.MintingInProg')
    }

    let hours = 0
    if (minutesUntilMint >= 60) {
      hours = Math.floor(minutesUntilMint / 60)
    }

    const minutes = minutesUntilMint % 60

    return t('shop.MintingIn', { hours, minutes })
  }, [mintAt, t])

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
        {mintText}
      </Text>
    </div>
  )
})

PendingGoldCard.displayName = 'PendingGoldCard'
