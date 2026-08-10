import clsx from 'clsx'
import { memo } from 'react'
import Skeleton from 'react-loading-skeleton'

import { DeckLeaderboardRowLayout } from '~/LeaderboardPage/shared/style/DeckLeaderboardRowLayout.css'
import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

const LOADER_ROWS = new Array(20).fill(undefined).map((_, i) => i)

export const DeckLeaderboardLoader = memo(() => {
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
            DeckLeaderboardRowLayout
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
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingX: '12px'
            })}
          >
            <Skeleton
              height="32px"
              width="100%"
              baseColor={THEME_COLORS.purple3}
              containerClassName={Sprinkles({ flex: 1 })}
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingX: '12px'
            })}
          >
            <Skeleton
              height="32px"
              width="100%"
              containerClassName={Sprinkles({ flex: 1 })}
              baseColor={THEME_COLORS.purple3}
              highlightColor={THEME_COLORS.purple4}
            />
          </div>
        </div>
      ))}
    </>
  )
})

DeckLeaderboardLoader.displayName = 'DeckLeaderboardLoader'
