import clsx from 'clsx'
import { memo } from 'react'

import { QuestStyle, QuestWrapperStyle } from '~/shared/style/Quest.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  QuestLoadingFrameGradient,
  QuestLoadingFrameMask
} from './QuestLoadingFrame.css'

export const QuestLoadingFrame = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          pointerEvents: 'none'
        }),
        QuestWrapperStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          }),
          QuestStyle
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              left: 0,
              top: 0
            }),
            QuestLoadingFrameMask
          )}
        >
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                height: 'full',
                position: 'relative',
                backgroundColor: 'purple4'
              }),
              QuestLoadingFrameGradient
            )}
          />
        </div>
      </div>
    </div>
  )
})

QuestLoadingFrame.displayName = 'QuestLoadingFrame'
