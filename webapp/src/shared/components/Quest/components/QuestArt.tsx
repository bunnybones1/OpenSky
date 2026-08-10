import clsx from 'clsx'
import { memo } from 'react'

import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestArtStyle } from './QuestArt.css'

interface QuestArtProps {
  artId: string
}

export const QuestArt = memo(({ artId }: QuestArtProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

  if (!getAssetUrl) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          zIndex: 2
        }),
        QuestArtStyle
      )}
    >
      <img
        ref={imgRef}
        onLoad={handleLoad}
        className={clsx(
          Sprinkles({
            width: 'full',
            opacity: isLoaded ? 1 : 0
          }),
          FadeInImageStyle
        )}
        src={getAssetUrl(`webapp/cards/quest-thumbs/4x/${artId}-thumbnail@4x.webp`)}
      />
    </div>
  )
})

QuestArt.displayName = 'QuestArt'
