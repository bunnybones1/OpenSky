import clsx from 'clsx'
import { memo, useEffect, useRef } from 'react'

import { Sprinkles } from '../style/Sprinkles.css'
import {
  UnreadBubble,
  UnreadBubbleInner,
  UnreadPulseAnimTrigger
} from './UnreadBadge.css'

interface UnreadBadgeProps {
  unread: number
  className?: string
}

export const UnreadBadge = memo(({ unread, className }: UnreadBadgeProps) => {
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const unreadRef = useRef(unread)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      badgeRef.current &&
      unread !== unreadRef.current &&
      !badgeRef.current.classList.contains(UnreadPulseAnimTrigger)
    ) {
      badgeRef.current.classList.add(UnreadPulseAnimTrigger)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        if (
          badgeRef.current &&
          badgeRef.current.classList.contains(UnreadPulseAnimTrigger)
        ) {
          badgeRef.current.classList.remove(UnreadPulseAnimTrigger)
        }
      }, 900)
    }
  }, [unread])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={badgeRef}
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          backgroundColor: 'purple1'
        }),
        UnreadBubble,
        className,
        { isLarge: unread > 99 }
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            backgroundColor: 'warm6',
            fontSize: '10px',
            color: 'black',
            fontWeight: '700',
            fontFamily: 'normal',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }),
          UnreadBubbleInner,
          { isLarge: unread > 99 }
        )}
      >
        {unread > 99 ? '99+' : unread}
      </div>
    </div>
  )
})

UnreadBadge.displayName = 'UnreadBadge'
