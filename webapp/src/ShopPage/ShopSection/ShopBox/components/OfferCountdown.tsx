import clsx from 'clsx'
import { memo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useTimeLeftSpecialOffer } from '~/shared/hooks/useTimeLeftSpecialOffer'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  OfferCountdownContainerStyle,
  OfferCountdownFontSize,
  OfferCountdownIconSize
} from './OfferCountdown.css'

interface OfferCountdownProps {
  expiration: string
}

export const OfferCountdown = memo(({ expiration }: OfferCountdownProps) => {
  const timeUntilSeason = useTimeLeftSpecialOffer(expiration)

  if (!expiration) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          zIndex: 5
        }),
        OfferCountdownContainerStyle
      )}
    >
      <Icon
        type="clock"
        color="warm6"
        height={undefined}
        className={OfferCountdownIconSize}
      />
      <Text color="warm6" fontWeight="700" className={OfferCountdownFontSize}>
        {timeUntilSeason?.toUpperCase()}
      </Text>
    </div>
  )
})

OfferCountdown.displayName = 'OfferCountdown'
