import clsx from 'clsx'
import { memo } from 'react'

import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  XpBarBar,
  XPBarBlock,
  XpBarLevelBlock,
  XpBarLevelBlockTwo,
  XpBarLevelTextWrapper,
  XPBarStyle
} from './XPBar.css'

interface Props {
  level: number
  experience: number
  levelUpXP: number
}

export const XPBar = memo(({ level, experience, levelUpXP }: Props) => {
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          zIndex: 4,
          backgroundColor: 'purple4',
          bottom: 0
        }),
        XPBarStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            backgroundColor: 'purple6',
            zIndex: 1
          }),
          XPBarBlock
        )}
      />
      <div
        style={{
          width:
            experience === 0
              ? '52px'
              : `calc(${(experience / levelUpXP) * 100}% - 4px)`
        }}
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 2,
            backgroundColor: 'cold7'
          }),
          XpBarBar
        )}
      />
      <div
        style={{
          width: '2px',
          left:
            experience === 0
              ? '52px'
              : `calc(${(experience / levelUpXP) * 100}% - 4px)`
        }}
        className={Sprinkles({
          backgroundColor: 'white',
          top: 0,
          height: 'full',
          position: 'absolute',
          zIndex: 3
        })}
      />
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            backgroundColor: 'cold7'
          }),
          XpBarLevelBlock
        )}
      />
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute'
          }),
          XpBarLevelBlockTwo
        )}
      />
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }),
          XpBarLevelTextWrapper
        )}
      >
        <Text fontSize="14px" color="purple4" fontWeight="700">
          {level}
        </Text>
      </div>
    </div>
  )
})

XPBar.displayName = 'XPBar'
