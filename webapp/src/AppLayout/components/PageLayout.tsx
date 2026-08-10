import { createSelector } from '@reduxjs/toolkit'
import clsx from 'clsx'
import { memo, ReactNode } from 'react'
import { matchPath } from 'react-router-dom'

import { FlexBox } from '~/shared/components/Base/FlexBox'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useSelector } from '~/shared/redux'
import {
  isDeckBuildingRouteSelector,
  isSkypassRouteSelector,
  pathNameSelector
} from '~/shared/redux/router/selectors'

import { PageLayoutStyle } from './PageLayout.css'

interface PageLayoutProps {
  children: ReactNode
}

const isNoPaddingRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return (
    !!pathname &&
    (!!matchPath(ROUTES_CONFIG.routes.CREATE_ACCOUNT.directPath, pathname) ||
      !!matchPath(ROUTES_CONFIG.routes.CREATE_DECK.directPath, pathname) ||
      !!matchPath(ROUTES_CONFIG.routes.PLAY.path, pathname))
  )
})

export const PageLayout = memo(({ children }: PageLayoutProps) => {
  const isNoPaddingRoute = useSelector(isNoPaddingRouteSelector)
  const isSkypassRoute = useSelector(isSkypassRouteSelector)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const isDeckBuildingRoute = useSelector(isDeckBuildingRouteSelector)

  const hidePadding =
    isNoPaddingRoute || (!isTabletWide && (isDeckBuildingRoute || isSkypassRoute))

  return (
    <FlexBox
      pl={hidePadding ? undefined : [NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      className={clsx(PageLayoutStyle, { hidePadding })}
      minHeight="100vh"
      width="100%"
      flexDirection="column"
    >
      {children}
    </FlexBox>
  )
})

PageLayout.displayName = 'PageLayout'
