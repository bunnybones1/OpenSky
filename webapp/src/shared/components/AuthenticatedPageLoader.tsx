import clsx from 'clsx'
import { memo } from 'react'
import Skeleton from 'react-loading-skeleton'

import { Portal } from '~/shared/components/Portal'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import {
  AuthenticatedPageLoaderNavBar,
  AuthenticatedPageLoaderStyle
} from './AuthenticatedPageLoader.css'

export const AuthenticatedPageLoader = memo(() => {
  return (
    <Portal>
      <div
        className={clsx(
          Sprinkles({
            position: 'fixed',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            backgroundColor: 'purple2',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            height: 'full',
            width: 'full'
          }),
          AuthenticatedPageLoaderStyle
        )}
      >
        <div
          className={clsx(
            AuthenticatedPageLoaderNavBar,
            Sprinkles({ display: 'grid' })
          )}
        >
          <div className={Sprinkles({ width: 'full', height: 'full' })}>
            <Skeleton
              height="100%"
              width="100%"
              baseColor={THEME_COLORS.purple3}
              borderRadius="0px"
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
          <div className={Sprinkles({ width: 'full', height: 'full' })}>
            <Skeleton
              height="100%"
              borderRadius="0px"
              width="100%"
              baseColor={THEME_COLORS.purple5}
              highlightColor={THEME_COLORS.purple6}
            />
          </div>
        </div>
      </div>
    </Portal>
  )
})

AuthenticatedPageLoader.displayName = 'AuthenticatedPageLoader'
