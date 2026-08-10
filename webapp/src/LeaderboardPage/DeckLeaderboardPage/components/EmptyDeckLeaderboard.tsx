import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { EmptyPlayerLeaderboardStyle } from '../../PlayerLeaderboardPage/components/EmptyPlayerLeaderboard.css'

export const EmptyDeckLeaderboard = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
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
          borderColor: 'purple7',
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
          flexDirection: 'column',
          paddingTop: '48px',
          paddingBottom: '48px'
        })}
      >
        <Text fontSize="22px" fontFamily="condensed" color="purple9">
          {t('ranks.emptyBoardMessage', {
            type: t('ranks.decks').toLowerCase()
          })}
        </Text>
        <div
          className={Sprinkles({
            paddingTop: '4px'
          })}
        >
          <Text fontSize="22px" fontFamily="condensed" color="purple9">
            {t('ranks.emptyBoardMessageSeason')}
          </Text>
        </div>
      </div>
      {!!getAssetUrl && (
        <img
          src={getAssetUrl('webapp/misc/end-of-list.webp')}
          style={{ width: '50%' }}
        />
      )}
    </div>
  )
})

EmptyDeckLeaderboard.displayName = 'EmptyDeckLeaderboard'
