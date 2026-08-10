import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useCardListNumColumns } from '~/shared/hooks/cards/useCardListNumColumns'
import { Sprinkles, SprinklesParams } from '~/shared/style/Sprinkles.css'

import {
  CardListLoaderColumns,
  CardListLoaderStyle,
  CardLoaderStyle,
  CardLoaderWrapperStyle,
  LoaderOverlay
} from './CardListLoader.css'

const CardLoader = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative'
        }),
        CardLoaderWrapperStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            zIndex: 1
          }),
          CardLoaderStyle
        )}
      />
    </div>
  )
})

CardLoader.displayName = 'CardLoader'

interface CardListLoaderProps {
  paddingBottom?: SprinklesParams['paddingBottom']
}

export const CardListLoader = memo(
  ({ paddingBottom = '12px' }: CardListLoaderProps) => {
    const numColumns = useCardListNumColumns()

    const rows = useMemo(() => {
      return new Array(numColumns)
        .fill(undefined)
        .map((_, index) => <CardLoader key={index} />)
    }, [numColumns])

    return (
      <div
        className={Sprinkles({
          width: 'full',
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
            CardListLoaderColumns[numColumns],
            CardListLoaderStyle
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
              CardListLoaderColumns[numColumns],
              CardListLoaderStyle
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

CardListLoader.displayName = 'CardListLoader'
