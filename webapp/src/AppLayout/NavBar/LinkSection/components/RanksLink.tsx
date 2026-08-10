import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useSelector } from '~/shared/redux/index'
import { isRanksRouteSelector } from '~/shared/redux/router/selectors'

import { NavBarLink } from '../../shared/components/NavBarLink/NavBarLink'

interface RanksLinkProps {
  isHorizontal: boolean
}

export const RanksLink = memo(({ isHorizontal }: RanksLinkProps) => {
  const isRanksRoute = useSelector(isRanksRouteSelector)
  const { t } = useTranslation()

  return (
    <NavBarLink
      to={ROUTES_CONFIG.routes.LEADERBOARD.routes.PLAYER_LEADERBOARD.directPath}
      isActive={isRanksRoute}
      text={t('navigation.ranks')}
      icon="leaderboard"
      id="leaderboard"
      isHorizontal={isHorizontal}
    />
  )
})

RanksLink.displayName = 'RanksLink'
