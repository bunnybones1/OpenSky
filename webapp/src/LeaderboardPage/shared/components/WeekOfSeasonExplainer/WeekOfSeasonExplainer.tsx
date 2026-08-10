import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { LeaderboardRewardsDialog } from '~/shared/components/LeaderboardRewardsDialog'
import { Text } from '~/shared/components/Text'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const diffWeeks = (dateStart: Date, dateEnd: Date) => {
  const diff = dateEnd.getTime() - dateStart.getTime()
  const weeks = diff / 1000 / (60 * 60 * 24 * 7)
  return Math.abs(Math.ceil(weeks))
}

export const WeekOfSeasonExplainer = memo(() => {
  const { t } = useTranslation()
  const { data: seasonInfo } = useSeasonInfo()

  const weekOfSeasonString = useMemo(() => {
    if (!seasonInfo?.currentSeasonStartTime || !seasonInfo?.nextSeasonStartTime) {
      return
    }
    const currentDate = new Date()
    const startDate = new Date(seasonInfo.currentSeasonStartTime)
    const endDate = new Date(seasonInfo.nextSeasonStartTime)
    const elapsedWeeks = diffWeeks(startDate, currentDate)
    const totalWeeks = diffWeeks(startDate, endDate)

    return t('ranks.weekElapsedOfTotal', { elapsed: elapsedWeeks, total: totalWeeks })
  }, [seasonInfo, t])

  const { Dialog } = useDialog({
    Element: LeaderboardRewardsDialog,
    id: 'LEADERBOARD_REWARDS_DIALOG_ID'
  })

  return (
    <>
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '8px'
        })}
      >
        {!!weekOfSeasonString && (
          <Text fontSize="12px" color="purple9">
            {weekOfSeasonString}
          </Text>
        )}
      </div>
      {Dialog}
    </>
  )
})

WeekOfSeasonExplainer.displayName = 'WeekOfSeasonExplainer'
