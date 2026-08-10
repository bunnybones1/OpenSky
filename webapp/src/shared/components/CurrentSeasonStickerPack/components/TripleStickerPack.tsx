import { memo } from 'react'

import { Box } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { StickerInfo } from '~/shared/queries/useCurrentSeasonStickers'

import { StickerImg } from './SingleStickerPack'

interface TripleStickerPackProps {
  sticker1: StickerInfo
  sticker2: StickerInfo
  sticker3: StickerInfo
}

export const TripleStickerPack = memo(
  ({ sticker1, sticker2, sticker3 }: TripleStickerPackProps) => {
    const { getAssetUrl } = useGetAssetContext()

    return (
      <>
        <Box
          width="53.2%"
          height="auto"
          position="absolute"
          left="6%"
          bottom="6%"
          transform="rotate(-10.33deg)"
          zIndex={2}
        >
          {!!getAssetUrl && (
            <StickerImg
              src={getAssetUrl(`webapp/stickers/4x/${sticker1.artID}.webp`)}
            />
          )}
        </Box>
        <Box
          width="41.31%"
          height="auto"
          position="absolute"
          left="33%"
          top="6%"
          style={{
            transform: 'rotate(13.25deg)'
          }}
          // transform={isDoublePack ? 'rotate(10deg)' : 'rotate(15deg)'}
          zIndex={1}
        >
          {!!getAssetUrl && (
            <StickerImg
              src={getAssetUrl(`webapp/stickers/4x/${sticker2.artID}.webp`)}
            />
          )}
        </Box>
        <Box
          width="50.83%"
          height="auto"
          position="absolute"
          bottom="6%"
          right={0}
          transform="rotate(15.94deg)"
          zIndex={3}
        >
          {!!getAssetUrl && (
            <StickerImg
              src={getAssetUrl(`webapp/stickers/4x/${sticker3.artID}.webp`)}
            />
          )}
        </Box>
      </>
    )
  }
)

TripleStickerPack.displayName = 'TripleStickerPack'
