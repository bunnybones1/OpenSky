import clsx from 'clsx'
import { memo, MouseEvent, useCallback } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckFavouriteButtonWrapper } from './DeckFavouriteButton.css'

interface DeckFavouriteButtonProps {
  onFavouriteChange: (favourited: boolean) => void
  isFavourited?: boolean
}

export const DeckFavouriteButton = memo(
  ({ onFavouriteChange, isFavourited }: DeckFavouriteButtonProps) => {
    const _onFavouriteChange = useCallback(
      (event: MouseEvent) => {
        event.stopPropagation()
        onFavouriteChange(isFavourited || false)
      },
      [isFavourited, onFavouriteChange]
    )
    return (
      <div
        onClick={_onFavouriteChange}
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          }),
          DeckFavouriteButtonWrapper,
          { isFavourited }
        )}
      >
        <Icon
          type="star-stroke"
          height="24px"
          color={isFavourited ? 'warm7' : 'purple7'}
        />
      </div>
    )
  }
)

DeckFavouriteButton.displayName = 'DeckFavouriteButton'
