import { useCallback, useEffect, useRef, useState } from 'react'

export const useImageIsLoaded = (onLoad?: () => void) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    if (onLoad) onLoad()
  }, [onLoad])

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true)
      if (onLoad) onLoad()
    }
  }, [onLoad])

  return { isLoaded, handleLoad, imgRef }
}
