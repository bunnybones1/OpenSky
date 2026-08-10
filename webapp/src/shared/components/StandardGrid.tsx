import * as React from 'react'

import { Grid } from '~/shared/components/Base/Grid'
import { CARD_LIBRARY_COLUMN_COUNTS } from '~/shared/constants/ui'

interface Props {
  gridTemplateColumns?: string[]
  gridGap?: number[]
  gridRowGap?: number[]
  gridColumnGap?: number[]
  children: React.ReactNode
  maxBlockSize?: string
}

export const StandardGrid = React.memo(
  ({
    children,
    gridTemplateColumns,
    gridGap,
    gridRowGap,
    gridColumnGap,
    maxBlockSize
  }: Props) => {
    return (
      <Grid
        width="100%"
        height="100%"
        pb={20}
        gridTemplateColumns={
          gridTemplateColumns || [
            /* mobileSmall */
            `repeat(${CARD_LIBRARY_COLUMN_COUNTS.EXTRA_SMALL}, 1fr)`,
            /* mobile */
            `repeat(${CARD_LIBRARY_COLUMN_COUNTS.SMALL}, 1fr)`,
            /* tablet */
            `repeat(${CARD_LIBRARY_COLUMN_COUNTS.MEDIUM}, 1fr)`,
            /* large */
            `repeat(${CARD_LIBRARY_COLUMN_COUNTS.LARGE}, 1fr)`,
            /* wide */
            `repeat(${CARD_LIBRARY_COLUMN_COUNTS.WIDE}, 1fr)`,
            /* ultrawide */
            `repeat(${CARD_LIBRARY_COLUMN_COUNTS.ULTRA_WIDE}, 1fr)`
          ]
        }
        gridGap={gridGap || undefined}
        gridColumnGap={gridColumnGap || ['10px']}
        gridRowGap={gridRowGap || ['16px']}
        style={{
          maxBlockSize: maxBlockSize ? maxBlockSize : undefined
        }}
      >
        {children}
      </Grid>
    )
  }
)

StandardGrid.displayName = 'StandardGrid'
