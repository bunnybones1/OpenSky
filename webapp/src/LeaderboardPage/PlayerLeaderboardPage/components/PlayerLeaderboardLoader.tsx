import clsx from 'clsx'
import { memo } from 'react'
import Skeleton from 'react-loading-skeleton'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { PlayerLeaderboardRowLayout } from '~/LeaderboardPage/shared/style/PlayerLeaderboardRowLayout.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

const LOADER_ROWS = new Array(25).fill(undefined).map((_, i) => i)

export const PlayerLeaderboardLoader = memo(() => {
  return (
    <>
      {LOADER_ROWS.map((index) => (
        <div
          key={index}
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'grid'
            }),
            MaxPlayerLeaderboardWidth,
            PlayerLeaderboardRowLayout
          )}
          style={{ opacity: (100 - index * (100 / LOADER_ROWS.length)) / 100 }}
        >
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              paddingLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            })}
          >
            <Skeleton
              height="48px"
              width="300px"
              baseColor={THEME_COLORS.purple3}
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <Skeleton
              height="18px"
              width="36px"
              baseColor={THEME_COLORS.purple3}
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <Skeleton
              height="18px"
              width="36px"
              baseColor={THEME_COLORS.purple3}
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <Skeleton
              height="18px"
              width="36px"
              baseColor={THEME_COLORS.purple3}
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
        </div>
      ))}
    </>
  )
})

PlayerLeaderboardLoader.displayName = 'PlayerLeaderboardLoader'
