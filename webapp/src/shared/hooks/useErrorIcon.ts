import { useMemo } from 'react'

export const useErrorIcon = () => {
  return useMemo(() => {
    const errorNum = Math.floor(Math.random() * 4) + 1

    switch (errorNum) {
      case 1:
        return 'webapp/misc/error-01.webp'
      case 2:
        return 'webapp/misc/error-02.webp'
      case 3:
        return 'webapp/misc/error-03.webp'
      case 4:
        return 'webapp/misc/error-04.webp'
      default:
        return 'webapp/misc/error-04.webp'
    }
  }, [])
}
