import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { WeekOfSeasonExplainer } from '~/LeaderboardPage/shared/components/WeekOfSeasonExplainer/WeekOfSeasonExplainer'
import { SeasonSelect } from '~/shared/components/SeasonSelect'
import { Text } from '~/shared/components/Text'
import {
  playerLeaderboardFilterState,
  updatePlayerLeaderboardFilter
} from '~/shared/state/player-leaderboard/player-leaderboard-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SeasonSelectWrapper } from './PlayerLeaderboardHeader.css'

const FontSize = { base: '36px', tabletWide: '42px' } as const

export const PlayerLeaderboardHeader = memo(() => {
  const { t } = useTranslation()

  const { season } = useSnapshot(playerLeaderboardFilterState)

  const onSeasonSelect = useCallback((_season: number) => {
    updatePlayerLeaderboardFilter('season', _season)
  }, [])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingY: '16px'
      })}
    >
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text
          color="purple9"
          fontWeight="700"
          fontFamily="condensed"
          fontSize={FontSize}
        >
          {t('ranks.playerLeaderboardHeader')}
        </Text>
        <div
          className={clsx(
            Sprinkles({ marginTop: '4px', marginLeft: '12px' }),
            SeasonSelectWrapper
          )}
        >
          <SeasonSelect selectedSeason={season} onChangeFn={onSeasonSelect} />
        </div>
      </div>
      <WeekOfSeasonExplainer />
    </div>
  )
})

PlayerLeaderboardHeader.displayName = 'PlayerLeaderboardHeader'
