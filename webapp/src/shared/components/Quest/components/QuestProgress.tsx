import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  QuestProgressLargeText,
  QuestProgressSmallText,
  QuestProgressStyle
} from './QuestProgress.css'

interface QuestProgressProps {
  progress: number
  endProgress: number
}

const END_PROGRESS_TIP = 56.6

export const QuestProgress = memo(({ progress, endProgress }: QuestProgressProps) => {
  const PROGRESS_BAR_TIP =
    progress >= endProgress
      ? END_PROGRESS_TIP
      : // We add one to make the halfway point look more like its halfway
        END_PROGRESS_TIP * (progress / endProgress) + 1

  const PROGRESS_BAR_TIP_START = PROGRESS_BAR_TIP - 2.6

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 3,
          position: 'absolute'
        }),
        QuestProgressStyle
      )}
    >
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1
        })}
      >
        {/* <Text
            className={clsx({ isLarge }, QuestProgressLargeText)}
            fontSize={!!isLarge ? '32px' : '22px'}
            color="cold8"
          >
            {progress}
          </Text> */}
        <div
          className={clsx(
            Sprinkles({
              color: 'cold8'
            }),
            QuestProgressLargeText
          )}
        >
          {progress}
        </div>
        <div
          className={clsx(
            Sprinkles({
              color: 'white',
              marginX: '4px'
            }),
            QuestProgressSmallText
          )}
        >
          /
        </div>
        <div
          className={clsx(
            Sprinkles({
              color: 'white'
            }),
            QuestProgressSmallText
          )}
        >
          {endProgress}
        </div>
      </div>
      <svg
        width="100%"
        viewBox="0 0 58 9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {!!progress && (
          <path
            d={`M 1 4.5 L 4 1.5 H ${PROGRESS_BAR_TIP_START} L ${PROGRESS_BAR_TIP} 4.5 L ${PROGRESS_BAR_TIP_START} 7.5 H 4L1 4.5 Z`}
            fill="#52FFFF"
          />
        )}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 3.5 1 H 54.5 L 58 4.5 L 54.5 8 H 3.5 L -7.62939e-05 4.5 L 3.5 1 Z M 3.9 2 L 1.4 4.5 L 3.9 7 H 54 L 56.6 4.5 L 54 2 H 3.9 Z"
          fill="#5E3EB9"
        />
      </svg>
    </div>
  )
})

QuestProgress.displayName = 'QuestProgress'
