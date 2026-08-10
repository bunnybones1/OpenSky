import { useEffect, useRef, useState } from 'react'

export const useMillisecondsElapsed = () => {
  const intervalRef = useRef<number | null>(null)
  const startMillisecondsRef = useRef(new Date().getTime())
  const [millisecondsElapsed, setMillisecondsElapsed] = useState(0)

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const currentMilliseconds = new Date().getTime()

      setMillisecondsElapsed(currentMilliseconds - startMillisecondsRef.current)
    }, 500)
  }, [])

  return { millisecondsElapsed }
}
