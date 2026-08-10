import { FlagCodes } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { FlagIcon } from '~/shared/components/FlagIcon'
import { RowArt } from '~/shared/components/RowArt/RowArt'
import { Text } from '~/shared/components/Text'
import { TAG_ART } from '~/shared/constants/tag-art'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { TopPlayerCellContainer } from './TopPlayerCell.css'

interface TopPlayerCellProps {
  name: string
  address: string
  tagArtID?: string
  region: FlagCodes | null
}

const FontSize = { base: '12px', tabletWide: '16px' } as const

export const TopPlayerCell = memo(
  ({ name, address, tagArtID, region }: TopPlayerCellProps) => {
    const art = useMemo(() => {
      let art: string | undefined

      if (!!tagArtID) {
        const tag = TAG_ART.get(tagArtID)
        if (!!tag) art = tag.artUrl
      }
      return art
    }, [tagArtID])

    return (
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          height: 'full',
          justifyContent: 'center',
          alignItems: 'center',
          paddingX: '4px',
          flexWrap: 'nowrap'
        })}
      >
        <Link
          className={clsx(
            Sprinkles({
              position: 'relative',
              width: 'full',
              border: '1px solid',
              borderColor: 'purple5'
            }),
            TopPlayerCellContainer
          )}
          to={makeAccountRoute(address)}
        >
          {art !== undefined && (
            <div
              className={Sprinkles({
                position: 'absolute',
                top: 0,
                left: 0,
                width: 'full',
                height: 'full',
                zIndex: 1
              })}
            >
              <RowArt url={art || ''} useWidthHeight />
            </div>
          )}
          <div
            className={Sprinkles({
              display: 'flex',
              width: 'full',
              height: 'full',
              justifyContent: 'flex-start',
              alignItems: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
              paddingLeft: '4px',
              zIndex: 2
            })}
          >
            <Text
              color="white"
              fontSize={FontSize}
              fontWeight="600"
              className={Sprinkles({
                paddingRight: '4px'
              })}
            >
              {name}
            </Text>
            {region !== null && (
              <div style={{ width: '16px' }}>
                <FlagIcon code={region} height="12px" />
              </div>
            )}
          </div>
        </Link>
      </div>
    )
  }
)

TopPlayerCell.displayName = 'TopPlayerCell'
