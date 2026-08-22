import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useSelector } from '~/shared/redux/index'
import { isSkypassRouteSelector } from '~/shared/redux/router/selectors'

import { NavBarLink } from '../../shared/components/NavBarLink/NavBarLink'

interface SkyPassLinkProps {
  isHorizontal: boolean
}

export const SkyPassLink = memo(({ isHorizontal }: SkyPassLinkProps) => {
  const isSkypassRoute = useSelector(isSkypassRouteSelector)
  const { t } = useTranslation()

  return (
    <NavBarLink
      to={ROUTES_CONFIG.routes.SKY_PASS.directPath}
      isActive={isSkypassRoute}
      text={t('navigation.skypass')}
      icon="sky-pass"
      id="skypass"
      isHorizontal={isHorizontal}
    />
  )
})

SkyPassLink.displayName = 'SkyPassLink'
