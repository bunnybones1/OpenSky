import clsx from 'clsx'
import { memo } from 'react'

import { SoundClient } from '~/shared/clients'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FancyActiveBackButtonSVG } from './components/FancyActiveBackButtonSVG'
import { FancyBackButtonSVG } from './components/FancyBackButtonSVG'
import {
  FancyActiveBackButtonStyle,
  FancyBackButtonStyle
} from './FancyBackButton.css'

interface FancyBackButtonProps {
  onClick: () => void
}

export const FancyBackButton = memo(({ onClick }: FancyBackButtonProps) => {
  return (
    <div
      onMouseDown={() => SoundClient.playSound('BackReturnSwipe')}
      onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      onClick={onClick}
      className={clsx(
        Sprinkles({
          width: 'full',
          cursor: 'pointer',
          position: 'relative'
        }),
        FancyBackButtonStyle
      )}
      data-id="fancy-back-button"
    >
      <div
        className={Sprinkles({
          position: 'absolute',
          left: 0,
          top: 0,
          width: 'full',
          height: 'full'
        })}
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
            FancyActiveBackButtonStyle
          )}
        >
          <FancyActiveBackButtonSVG />
        </div>
        <FancyBackButtonSVG />
      </div>
    </div>
  )
})

FancyBackButton.displayName = 'FancyBackButton'
