import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { BASE_PADDING_BOTTOM } from '~/shared/constants/ui'
import { useDeckListNumColumns } from '~/shared/hooks/decks/useDeckListNumColumns'
import { Sprinkles, SprinklesParams } from '~/shared/style/Sprinkles.css'

import {
  DeckListLoaderColumns,
  DeckLoaderStyle,
  DeckLoaderWrapperStyle,
  DecksListLoaderStyle,
  LoaderOverlay
} from './DeckListLoader.css'

export const DeckLoader = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative'
        }),
        DeckLoaderWrapperStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 1
          }),
          DeckLoaderStyle
        )}
      />
    </div>
  )
})

DeckLoader.displayName = 'DeckLoader'

interface DecksListLoaderProps {
  paddingBottom?: SprinklesParams['paddingBottom']
}

export const DecksListLoader = memo(
  ({ paddingBottom = `${BASE_PADDING_BOTTOM}px` }: DecksListLoaderProps) => {
    const numColumns = useDeckListNumColumns()

    const rows = useMemo(() => {
      return new Array(numColumns)
        .fill(undefined)
        .map((_, index) => <DeckLoader key={index} />)
    }, [numColumns])

    return (
      <div
        className={Sprinkles({
          width: 'full',
          // paddingTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        })}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'grid',
              width: 'full',
              paddingBottom
            }),
            DeckListLoaderColumns[numColumns],
            DecksListLoaderStyle
          )}
        >
          {rows}
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            position: 'relative'
          })}
        >
          <div
            className={clsx(
              Sprinkles({
                display: 'grid',
                width: 'full',
                paddingBottom
              }),
              DeckListLoaderColumns[numColumns],
              DecksListLoaderStyle
            )}
          >
            {rows}
          </div>
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                height: 'full',
                position: 'absolute',
                left: 0,
                bottom: 0,
                zIndex: 2
              }),
              LoaderOverlay
            )}
          />
        </div>
      </div>
    )
  }
)

DecksListLoader.displayName = 'DecksListLoader'
