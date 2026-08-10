import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface QuestOverlayProps {
  isClaimed?: boolean
  isClaimable?: boolean
  isLocked?: boolean
}

export const QuestOverlay = memo(
  ({ isLocked, isClaimed, isClaimable }: QuestOverlayProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

    const src = useMemo(() => {
      if (!getAssetUrl) return null
      if (isLocked) {
        return getAssetUrl('webapp/misc/quest-locked-overlay.webp')
      }
      if (isClaimed) {
        return getAssetUrl('webapp/misc/quest-claimed-overlay.webp')
      }
      if (isClaimable) {
        return getAssetUrl('webapp/misc/quest-claimable-overlay.webp')
      }
      return null
    }, [getAssetUrl, isClaimable, isClaimed, isLocked])

    if (!src) return null

    return (
      <img
        src={src}
        className={clsx(
          Sprinkles({
            width: 'full',
            opacity: isLoaded ? 1 : 0,
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 4
          }),
          FadeInImageStyle
        )}
        ref={imgRef}
        onLoad={handleLoad}
      />
    )
  }
)

QuestOverlay.displayName = 'QuestOverlay'
