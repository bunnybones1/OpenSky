import clsx from 'clsx'
import { memo } from 'react'

import { SoundClient } from '~/shared/clients'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FancyActiveCloseButtonSVG } from './components/FancyActiveCloseButtonSVG'
import { FancyCloseButtonSVG } from './components/FancyCloseButtonSVG'
import {
  FancyActiveCloseButtonStyle,
  FancyCloseButtonStyle
} from './FancyCloseButton.css'

interface FancyCloseButtonProps {
  onClick: () => void
}

export const FancyCloseButton = memo(({ onClick }: FancyCloseButtonProps) => {
  return (
    <div
      onMouseDown={() => SoundClient.playSound('ModalCloseSwipe')}
      onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      onClick={onClick}
      className={clsx(
        Sprinkles({
          width: 'full',
          cursor: 'pointer',
          position: 'relative'
        }),
        FancyCloseButtonStyle
      )}
      data-id="fancy-close-button"
    >
      <div
        className={Sprinkles({
          position: 'absolute',
          top: 0,
          left: 0,
          width: 'full',
          height: 'full'
        })}
      >
        <div
          key="active"
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              left: 0,
              top: 0
            }),
            FancyActiveCloseButtonStyle
          )}
        >
          <FancyActiveCloseButtonSVG />
        </div>
        <FancyCloseButtonSVG />
      </div>
    </div>
  )
})

FancyCloseButton.displayName = 'FancyCloseButton'
