import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { playerLeaderboardUIState } from '~/shared/state/player-leaderboard/player-leaderboard-ui-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { EmptyPlayerLeaderboardStyle } from './EmptyPlayerLeaderboard.css'

export const EmptyPlayerLeaderboard = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { isPlayer } = useSnapshot(playerLeaderboardUIState)
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderBottom: '1px solid',
          backgroundColor: 'purple1',
          borderColor: 'purple5',
          paddingX: {
            base: '8px',
            mobile: '16px',
            tabletWide: '0px'
          }
        }),
        MaxPlayerLeaderboardWidth,
        EmptyPlayerLeaderboardStyle
      )}
    >
      {!!getAssetUrl && (
        <img
          src={getAssetUrl('webapp/misc/end-of-list.webp')}
          style={{ width: '50%', transform: 'rotate(-180deg)' }}
        />
      )}
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '48px',
          paddingBottom: isPlayer ? '48px' : '0px'
        })}
      >
        <Text fontSize="22px" fontFamily="condensed" color="purple9">
          {isPlayer
            ? t('ranks.emptyAccountMessage')
            : t('ranks.emptyBoardMessage', {
                type: t('ranks.players').toLowerCase()
              })}
        </Text>
      </div>
      {!isPlayer && (
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '48px'
          })}
        >
          <Text fontSize="22px" fontFamily="condensed" color="purple9">
            {t('ranks.emptyBoardMessageSeason')}
          </Text>
        </div>
      )}
      {!!getAssetUrl && (
        <img
          src={getAssetUrl('webapp/misc/end-of-list.webp')}
          style={{ width: '50%' }}
        />
      )}
    </div>
  )
})

EmptyPlayerLeaderboard.displayName = 'EmptyPlayerLeaderboard'
