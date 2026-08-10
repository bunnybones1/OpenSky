import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  LevelProgressContainer,
  LevelProgressSeparatorContainer
} from './LevelProgress.css'

interface LevelProgressProps {
  experience: number
  levelUpXP: number
  userLevel: number
  level: number
}

export const LevelProgress = memo(
  ({ experience, levelUpXP, userLevel, level }: LevelProgressProps) => {
    const nextLevel = userLevel + 1
    const prevLevel = level <= nextLevel
    const completedLevel = level <= userLevel
    const currentLevel = level === nextLevel

    const percentXP = useMemo(
      () =>
        level > userLevel && experience <= levelUpXP
          ? (experience / levelUpXP) * 100
          : 100,
      [experience, levelUpXP, userLevel, level]
    )

    return (
      <>
        <div
          className={clsx(
            Sprinkles({ width: 'full', backgroundColor: 'purple6' }),
            LevelProgressSeparatorContainer
          )}
        >
          <div
            className={Sprinkles({
              backgroundColor: prevLevel ? 'cold7' : 'purple6'
            })}
            style={{
              height: '4px',
              width: experience === 0 && !(level < nextLevel) ? '0%' : `${percentXP}%`
            }}
          />
        </div>
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              backgroundColor: 'purple4',
              border: '1px solid',
              borderColor: 'purple6'
            }),
            LevelProgressContainer
          )}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              backgroundColor: prevLevel ? 'cold2' : 'purple4',
              border: experience !== 0 || completedLevel ? '1px solid' : undefined,
              borderColor: prevLevel ? 'cold4' : 'purple6'
            })}
            style={{
              height: '24px',
              left: '-1px',
              top: '-1px',
              borderRightWidth:
                completedLevel || experience >= levelUpXP ? '1px' : '0px',
              width:
                experience === 0 && level >= nextLevel
                  ? '0%'
                  : `calc(${percentXP}% + 2px)`
            }}
          />
          <Text
            fontSize={'16px'}
            color={
              completedLevel || (percentXP >= 50 && currentLevel)
                ? 'cold7'
                : 'purple8'
            }
            fontWeight="600"
            textAlign="center"
            className={Sprinkles({ zIndex: 2, position: 'absolute' })}
          >
            {level}
          </Text>
        </div>
      </>
    )
  }
)

LevelProgress.displayName = 'LevelProgress'
