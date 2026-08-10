import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '../style/Sprinkles.css'
import { SmallUnreadBadgeStyle } from './SmallUnreadBadge.css'
import { Text } from './Text'

interface SmallUnreadBadgeProps {
  unread: number
  className?: string
}

export const SmallUnreadBadge = memo(
  ({ unread, className }: SmallUnreadBadgeProps) => {
    return (
      <div
        className={clsx(
          Sprinkles({
            backgroundColor: 'warm6',
            position: 'absolute',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: 'purple1'
          }),
          SmallUnreadBadgeStyle,
          className
        )}
      >
        <Text color="black" fontSize="10px" fontWeight="400" fontFamily="condensed">
          {unread > 99 ? '99+' : unread}
        </Text>
      </div>
    )
  }
)

SmallUnreadBadge.displayName = 'SmallUnreadBadge'
