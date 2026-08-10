import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import {
  PlayerLeaderboardRowLayout,
  PlayerLeaderboardRowLayoutNoRewards
} from '~/LeaderboardPage/shared/style/PlayerLeaderboardRowLayout.css'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeVars } from '~/shared/style/Theme.css'

import { PlayerNameHeader } from './components/PlayerNameHeader'
import { SeasonEndHeader } from './components/SeasonEndHeader'

const FontSize = { base: '14px', tabletWide: '16px' } as const

interface PlayerLeaderboardTableHeaderProps {
  hideBottomBorder?: boolean
  showRewardColumn?: boolean
}

export const PlayerLeaderboardTableHeader = memo(
  ({ hideBottomBorder, showRewardColumn }: PlayerLeaderboardTableHeaderProps) => {
    const { t } = useTranslation()

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            borderTop: '1px solid'
          }),
          MaxPlayerLeaderboardWidth,
          showRewardColumn
            ? PlayerLeaderboardRowLayout
            : PlayerLeaderboardRowLayoutNoRewards
        )}
        style={{
          borderBottom: hideBottomBorder
            ? 'none'
            : `1px solid ${ThemeVars.color.purple7}`
        }}
      >
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            borderRight: '1px solid',
            borderColor: 'purple7'
          })}
        >
          <PlayerNameHeader />
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            borderRight: '1px solid',
            borderColor: 'purple7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          <Text fontSize={FontSize} color="purple9">
            {t('ranks.RP')}
          </Text>
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            borderRight: '1px solid',
            borderColor: 'purple7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          <Text fontSize={FontSize} color="purple9">
            {t('ranks.winRateHeader')}
          </Text>
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            borderRight: '1px solid',
            borderColor: 'purple7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          <Text fontSize={FontSize} color="purple9">
            {t('ranks.gamesPlayedHeader')}
          </Text>
        </div>
        {showRewardColumn && (
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              borderColor: 'purple7'
            })}
          >
            <SeasonEndHeader />
          </div>
        )}
      </div>
    )
  }
)

PlayerLeaderboardTableHeader.displayName = 'PlayerLeaderboardHeader'
