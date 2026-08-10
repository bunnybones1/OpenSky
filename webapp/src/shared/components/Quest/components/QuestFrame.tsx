import clsx from 'clsx'
import { memo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface QuestFrameProps {
  isClaimed?: boolean
  isClaimable?: boolean
}

export const QuestFrame = memo(({ isClaimed, isClaimable }: QuestFrameProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { isLoaded, handleLoad, imgRef } = useImageIsLoaded()

  if (!getAssetUrl) return null

  return (
    <img
      ref={imgRef}
      onLoad={handleLoad}
      src={getAssetUrl(
        `webapp/misc/quest-frame-${
          !!isClaimed || !!isClaimable ? 'blue' : 'purple'
        }.webp`
      )}
      className={clsx(
        Sprinkles({
          width: 'full',
          opacity: isLoaded ? 1 : 0,
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 2
        }),
        FadeInImageStyle
      )}
    />
  )
})

QuestFrame.displayName = 'QuestFrame'
