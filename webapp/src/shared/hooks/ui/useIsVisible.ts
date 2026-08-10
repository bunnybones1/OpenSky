import { MutableRefObject, useEffect, useState } from 'react'

export function useIsVisible(ref: MutableRefObject<Element | null>) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setIsVisible(entry.isIntersecting)
    )

    if (!!ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return { isVisible }
}
