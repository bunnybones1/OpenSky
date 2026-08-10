import clsx from 'clsx'
import { memo, useEffect, useLayoutEffect, useRef } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { HorizontalFrameOne } from './components/HorizontalFrameOne'
import { HorizontalFrameTwo } from './components/HorizontalFrameTwo'
import { NavBarLinkNotificationText } from './components/NavBarLinkNotificationText'
import { VerticalFrameOne } from './components/VerticalFrameOne'
import { VerticalFrameTwo } from './components/VerticalFrameTwo'
import { NavBarLinkNotificationStyle } from './NavBarLinkNotification.css'
import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY,
  NOTIF_DISAPPEAR,
  NOTIF_READ_DELAY
} from './shared/constants'

interface NavBarLinkNotificationProps {
  text: string
  isHorizontal?: boolean
  onNotificationEnd: () => void
}

// Mount delay + frame one appear + frame 1 to 2 transition + delay + disappear
const ANIM_DURATION =
  NOTIF_ANIM_DELAY +
  FRAME_ONE_APPEAR +
  FRAME_TRANSITION_DELAY +
  FRAME_TWO_APPEAR +
  NOTIF_READ_DELAY +
  NOTIF_DISAPPEAR

export const NavBarLinkNotification = memo(
  ({ text, isHorizontal, onNotificationEnd }: NavBarLinkNotificationProps) => {
    const animationEndTimeout = useRef<number | null>(null)

    useLayoutEffect(() => {
      animationEndTimeout.current = window.setTimeout(() => {
        onNotificationEnd()
      }, ANIM_DURATION)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      return () => {
        if (animationEndTimeout.current) {
          window.clearTimeout(animationEndTimeout.current)
        }
      }
    }, [])

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            top: 0,
            left: 0,
            height: 'full',
            width: 'full',
            zIndex: 5,
            pointerEvents: 'none'
          }),
          NavBarLinkNotificationStyle
        )}
      >
        {isHorizontal ? (
          <>
            <HorizontalFrameOne />
            <HorizontalFrameTwo />
          </>
        ) : (
          <>
            <VerticalFrameOne />
            <VerticalFrameTwo />
          </>
        )}
        <NavBarLinkNotificationText text={text} isHorizontal={isHorizontal} />
      </div>
    )
  }
)

NavBarLinkNotification.displayName = 'NavBarLinkNotification'
