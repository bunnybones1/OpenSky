import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

import { Badge, BadgeContainer } from './LargeCornerBadge.css'

interface LargeCornerBadgeProps {
  badgeText: string
  badgeColor: ThemeColorType
}

const LargeCornerBadge = memo(({ badgeText, badgeColor }: LargeCornerBadgeProps) => {
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'purple1',
          position: 'absolute',
          zIndex: 4
        }),
        BadgeContainer
      )}
      style={{
        backgroundImage: `radial-gradient(rgba(0, 0, 0, 0) 0%, ${ThemeVars.color[badgeColor]} 20%, transparent 70%)`
      }}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'purple1',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: '600',
            color: 'black'
          }),
          Badge
        )}
        style={{
          background: ThemeVars.color[badgeColor]
        }}
      >
        {badgeText}
      </div>
    </div>
  )
})

LargeCornerBadge.displayName = 'NewBadge'

export default LargeCornerBadge
