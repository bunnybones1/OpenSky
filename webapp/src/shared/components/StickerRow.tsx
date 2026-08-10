import { Sticker } from '@opensky/shared/constants'
import clsx from 'clsx'
import { forwardRef, memo, useCallback, useMemo } from 'react'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { AllStickers } from '~/shared/constants/stickers'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useGetAssetContext } from '../hooks/useGetAssetContext'
import {
  NameWrapper,
  RowBorder,
  RowOverlay,
  RowWrapper,
  StickerIcon,
  StickerImg
} from './StickerRow.css'
import { Text } from './Text'

interface StickerRowProps {
  id: number
  isLocked?: boolean
  className?: Parameters<typeof clsx>[0]
  onClick?: (card: Sticker) => void
}

const NameFontSizes = {
  tablet: '16px',
  tabletWide: '16px',
  desktop: '18px'
} as const

const IconHeight = { base: '24px', tablet: '32px' } as const

const _StickerRow = forwardRef<HTMLDivElement, StickerRowProps>(
  ({ id, isLocked, className, onClick }, ref) => {
    const sticker = useMemo(() => AllStickers.get(id), [id])
    const { getAssetUrl } = useGetAssetContext()
    const _onClick = useCallback(() => {
      if (sticker && onClick) onClick(sticker)
    }, [sticker, onClick])

    if (!sticker) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            cursor: !!onClick ? 'pointer' : undefined
          }),
          RowWrapper,
          className,
          {
            isLocked
          }
        )}
        ref={ref}
        onClick={_onClick}
      >
        <div
          className={clsx(
            StickerIcon,
            Sprinkles({
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })
          )}
        >
          <ImageIcon type="stickers-solid" height={IconHeight} />
        </div>
        {/* Name */}
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }),
            NameWrapper
          )}
        >
          <Text
            color="white"
            fontSize={NameFontSizes}
            fontWeight="400"
            fontFamily="condensed"
          >
            {sticker.name}
          </Text>
        </div>
        {/* Border & Overlay */}
        <div
          className={clsx(
            Sprinkles({
              border: '1px solid',
              marginLeft: { base: '12px', mobile: '12px', tablet: '16px' },
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              backgroundColor: 'purple1',
              overflow: 'hidden',
              position: 'relative'
            }),
            RowBorder,
            { hoverBorder: !!onClick }
          )}
        >
          {!isLocked && (
            <div
              className={clsx(
                Sprinkles({ width: 'full', height: 'full' }),
                RowOverlay
              )}
            />
          )}
          {!!getAssetUrl && (
            <img
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  top: 0
                }),
                StickerImg
              )}
              src={getAssetUrl(`webapp/stickers/2x/${sticker.artID}.webp`)}
            />
          )}
        </div>
      </div>
    )
  }
)

_StickerRow.displayName = 'StickerRowWithRef'

export const StickerRow = memo(_StickerRow)

StickerRow.displayName = 'StickerRow'
