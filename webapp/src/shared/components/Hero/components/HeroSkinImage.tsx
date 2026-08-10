import clsx from 'clsx'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { HeroSkinImageStyle } from './HeroSkinImage.css'

interface HeroSkinImageProps {
  artID: string
  onClick?: () => void
}

export const HeroSkinImage = memo(({ artID, onClick }: HeroSkinImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const { getAssetUrl } = useGetAssetContext()

  const srcSet = useMemo(() => {
    if (!getAssetUrl) return

    return `
      ${getAssetUrl(`webapp/heroes/full-cards/2x/${artID}.webp`)} 173w,
      ${getAssetUrl(`webapp/heroes/full-cards/4x/${artID}.webp`)} 346w,
      ${getAssetUrl(`webapp/heroes/full-cards/6x/${artID}.webp`)} 546w
    `
  }, [artID, getAssetUrl])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true)
    }
  }, [])

  if (!getAssetUrl) return null

  return (
    <img
      onClick={onClick}
      ref={imgRef}
      srcSet={srcSet}
      onLoad={handleLoad}
      className={clsx(
        Sprinkles({
          width: 'full',
          opacity: isLoaded ? 1 : 0
        }),
        HeroSkinImageStyle
      )}
    />
  )
})

HeroSkinImage.displayName = 'HeroSkinImage'
