import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameModeDescriptionStyle } from './GameModeDescription.css'

interface GameModeDescriptionProps {
  description: string
}

export const GameModeDescription = memo(
  ({ description }: GameModeDescriptionProps) => {
    return (
      <div
        className={clsx(
          Sprinkles({
            color: 'purple9',
            fontWeight: '500',
            fontSize: { base: '14px', tabletWide: '18px' },
            marginY: { base: '0px', tabletWide: '16px' }
          }),
          GameModeDescriptionStyle
        )}
      >
        {description}
      </div>
    )
  }
)

GameModeDescription.displayName = 'GameModeDescription'
