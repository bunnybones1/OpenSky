import { memo } from 'react'

import { Box } from '~/shared/components/Base'
import { MagicExplosionWrapper } from '~/shared/components/webgl/MagicExplosionWrapper'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface Props {
  artID: string
  hasExplosion: boolean
}

export const StickerImage = memo(({ artID, hasExplosion }: Props) => {
  const { getAssetUrl } = useGetAssetContext()

  return (
    <Box
      width={[150, 175, 300, 300, 350]}
      right={[100, 100, 150, 200, 275]}
      top={['12%', '12%', '15%', '17%', '20%']}
      style={{
        position: 'absolute',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    >
      <MagicExplosionWrapper
        explosionEffect={hasExplosion}
        explosionEffectVisibleStart={true}
        isReadyToAnimate={true}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(`webapp/stickers/6x/${artID}.webp`)}
            style={{
              width: '100%'
            }}
          />
        )}
      </MagicExplosionWrapper>
    </Box>
  )
})

StickerImage.displayName = 'StickerImage'
