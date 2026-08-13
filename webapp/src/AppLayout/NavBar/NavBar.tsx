import clsx from 'clsx'
import { memo } from 'react'

import { Portal } from '~/shared/components/Portal'
import { ProfileLink } from '~/shared/components/ProfileLink/ProfileLink'
import { NAVBAR_ID } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useSelector } from '~/shared/redux'
import {
  isDeckBuildingRouteSelector,
  isSkypassRouteSelector,
  shouldHideNavBarSelector
} from '~/shared/redux/router/selectors'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import Banners from './components/Banners'
import { HomeLink } from './components/HomeLink'
import { LinkSection } from './LinkSection/LinkSection'
import { NavBarStyle } from './NavBar.css'

export const NavBar = memo(() => {
  const hideNavBar = useSelector(shouldHideNavBarSelector)
  const isDeckbuilding = useSelector(isDeckBuildingRouteSelector)
  const isSkypassRoute = useSelector(isSkypassRouteSelector)
  const isTabletWide = useResponsiveQuery('tabletWide')

  if (hideNavBar || ((isDeckbuilding || isSkypassRoute) && !isTabletWide)) {
    return null
  }

  return (
    <Portal>
      <div
        className={clsx(
          Sprinkles({
            position: 'fixed'
          }),
          NavBarStyle,
          { isHorizontal: isTabletWide }
        )}
        id={NAVBAR_ID}
      >
        <Banners />
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            height: 'full',
            position: 'relative',
            flexWrap: 'nowrap',
            alignItems: isTabletWide ? 'center' : 'flex-start',
            justifyContent: isTabletWide ? 'space-between' : 'center',
            flexDirection: isTabletWide ? 'row' : 'column',
            backgroundColor: isTabletWide ? undefined : 'purple4',
            borderRight: isTabletWide ? undefined : '1px solid',
            borderColor: 'purple7'
          })}
        >
          <HomeLink isHorizontal={isTabletWide} />
          {isTabletWide && <ProfileLink />}
          <LinkSection isHorizontal={isTabletWide} />
        </div>
      </div>
    </Portal>
  )
})

NavBar.displayName = 'NavBar'
