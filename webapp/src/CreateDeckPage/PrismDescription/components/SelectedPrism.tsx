import clsx from 'clsx'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { createDeckState } from '~/CreateDeckPage/shared/state/create-deck-state'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SelectedPrismImage,
  SelectedPrismInner,
  SelectedPrismStyle
} from './SelectedPrism.css'

export const SelectedPrism = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { deckClass } = useSnapshot(createDeckState)
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'relative',
          height: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          zIndex: 3
        }),
        SelectedPrismStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'relative'
          }),
          SelectedPrismInner
        )}
      >
        <div
          className={Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
            height: 'full',
            width: 'full'
          })}
        >
          {!!getAssetUrl && (
            <img
              className={Sprinkles({ width: 'full' })}
              src={getAssetUrl('webapp/backgrounds/create-deck-structure.webp')}
            />
          )}
        </div>
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2
            }),
            SelectedPrismImage
          )}
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl(`webapp/icons/prisms/large/${deckClass}.webp`)})`
              : undefined
          }}
        />
      </div>
    </div>
  )
})

SelectedPrism.displayName = 'SelectedPrism'
