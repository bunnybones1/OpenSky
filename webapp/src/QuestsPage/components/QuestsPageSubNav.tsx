import { QuestPeriodicity } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { FancyPageTitle } from '~/shared/components/FancyPageTitle/FancyPageTitle'
import { SubNavButton } from '~/shared/components/SubNav/exported/SubNavButton'
import { SubNav } from '~/shared/components/SubNav/SubNav'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useQuestsList } from '~/shared/queries/useQuestsList'
import { authenticationState } from '~/shared/state/authentication-state'

export const QuestsPageSubNav = memo(() => {
  const { t } = useTranslation()
  const { userAddress } = useSnapshot(authenticationState)
  const isTablet = useResponsiveQuery('tablet')
  const { data: questsList } = useQuestsList(userAddress)

  const {
    seasonalCount,
    weeklyCount,
    weeklyNew,
    seasonalNew,
    dailyClaimable,
    weeklyClaimable,
    seasonalClaimable
  } = useMemo(() => {
    let _weeklyCount = 0
    let _seasonalCount = 0
    let _weeklyNew = 0
    let _seasonalNew = 0
    let _dailyClaimable = false
    let _weeklyClaimable = false
    let _seasonalClaimable = false

    if (!!questsList?.quests) {
      questsList.quests.forEach((quest) => {
        if (quest.periodicity === QuestPeriodicity.WEEKLY) {
          _weeklyCount += 1
          if (quest.isNew) _weeklyNew += 1
          if (quest.isClaimable && !quest.isClaimed) _weeklyClaimable = true
        }
        if (quest.periodicity === QuestPeriodicity.SEASONAL) {
          _seasonalCount += 1
          if (quest.isNew) _seasonalNew += 1
          if (quest.isClaimable && !quest.isClaimed) _seasonalClaimable = true
        }
        if (
          quest.periodicity === QuestPeriodicity.DAILY &&
          quest.isClaimable &&
          !quest.isClaimed
        ) {
          _dailyClaimable = true
        }
      })
    }

    return {
      weeklyCount: _weeklyCount,
      seasonalCount: _seasonalCount,
      weeklyNew: _weeklyNew,
      seasonalNew: _seasonalNew,
      dailyClaimable: _dailyClaimable,
      weeklyClaimable: _weeklyClaimable,
      seasonalClaimable: _seasonalClaimable
    }
  }, [questsList])

  return (
    <SubNav>
      <FancyPageTitle
        text={t('quests.quests')}
        icon={isTablet ? 'quest' : undefined}
      />
      <SubNavButton
        to={ROUTES_CONFIG.routes.QUESTS.routes.DAILY.directPath}
        text={t('quests.subNavDaily')}
        icon="calendar-star"
        id="daily-quests"
        pulseText={dailyClaimable ? t('skypass.thumbs.CLAIM') : undefined}
      />
      <SubNavButton
        to={ROUTES_CONFIG.routes.QUESTS.routes.WEEKLY.directPath}
        text={t('quests.subNavWeekly')}
        icon="calendar-weekly"
        id="weekly-quests"
        isDisabled={!weeklyCount}
        unread={weeklyNew}
        pulseText={weeklyClaimable ? t('skypass.thumbs.CLAIM') : undefined}
      />
      <SubNavButton
        to={ROUTES_CONFIG.routes.QUESTS.routes.SEASONAL.directPath}
        text={t('quests.subNavSeasonal')}
        icon="calendar"
        id="seasonal-quests"
        isDisabled={!seasonalCount}
        unread={seasonalNew}
        pulseText={seasonalClaimable ? t('skypass.thumbs.CLAIM') : undefined}
      />
    </SubNav>
  )
})

QuestsPageSubNav.displayName = 'QuestsPageSubNav'
