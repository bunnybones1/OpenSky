import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestTextDescription, QuestTextStyle, QuestTextTitle } from './QuestText.css'

interface QuestTextProps {
  title: string
  description: string
}

export const QuestText = memo(({ title, description }: QuestTextProps) => {
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
        QuestTextStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            color: 'cold8',
            fontWeight: '700'
          }),
          QuestTextTitle
        )}
      >
        {title}
      </div>
      <div
        className={clsx(
          Sprinkles({
            color: 'white',
            textAlign: 'center',
            marginTop: '4px',
            fontWeight: '500'
          }),
          QuestTextDescription
        )}
      >
        {description}
      </div>
    </div>
  )
})

QuestText.displayName = 'QuestText'
