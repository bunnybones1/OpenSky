import clsx from 'clsx'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  FRAME_ONE_APPEAR,
  FRAME_TRANSITION_DELAY,
  FRAME_TWO_APPEAR,
  NOTIF_ANIM_DELAY,
  NOTIF_DISAPPEAR,
  NOTIF_READ_DELAY
} from '../shared/constants'
import { NavBarLinkNotificationTextStyle } from './NavBarLinkNotificationText.css'

interface NavBarLinkNotificationTextProps {
  text: string
  isHorizontal?: boolean
}

const END_DURATION =
  NOTIF_ANIM_DELAY +
  FRAME_ONE_APPEAR +
  FRAME_TRANSITION_DELAY +
  FRAME_TWO_APPEAR +
  NOTIF_READ_DELAY +
  NOTIF_DISAPPEAR / 2

export const NavBarLinkNotificationText = memo(
  ({ text, isHorizontal }: NavBarLinkNotificationTextProps) => {
    const [hasAnimStarted, setHasAnimStarted] = useState(false)
    const hasAnimStartedTimeout = useRef<number | null>(null)
    const hasAnimEndedTimeout = useRef<number | null>(null)
    const [hasAnimEnded, setHasAnimEnded] = useState(false)

    useLayoutEffect(() => {
      hasAnimStartedTimeout.current = window.setTimeout(
        () => {
          setHasAnimStarted(true)
        },
        NOTIF_ANIM_DELAY + FRAME_ONE_APPEAR / 2
      )
      hasAnimEndedTimeout.current = window.setTimeout(() => {
        setHasAnimEnded(true)
        // eslint-disable-next-line max-len
      }, END_DURATION)
    }, [])

    useEffect(() => {
      return () => {
        if (!!hasAnimStartedTimeout.current) {
          window.clearTimeout(hasAnimStartedTimeout.current)
        }
        if (!!hasAnimEndedTimeout.current) {
          window.clearTimeout(hasAnimEndedTimeout.current)
        }
      }
    }, [])

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            paddingY: '4px',
            paddingX: '12px',
            fontSize: '10px',
            fontWeight: '700',
            fontFamily: 'normal',
            opacity: hasAnimEnded || !hasAnimStarted ? 0 : 1
          }),
          { isHorizontal },
          NavBarLinkNotificationTextStyle
        )}
      >
        {text}
      </div>
    )
  }
)

NavBarLinkNotificationText.displayName = 'NavBarLinkNotificationText'
