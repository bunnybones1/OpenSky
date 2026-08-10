import { memo, ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export const Portal = memo(({ children }: { children: ReactNode }) => {
  const el = useRef(document.createElement('div'))

  useEffect(() => {
    const portalRoot = document.getElementById('portal')

    if (!!portalRoot) {
      portalRoot.appendChild(el.current)
    }
    return () => {
      if (!!portalRoot) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        portalRoot.removeChild(el.current)
      }
    }
  }, [])

  return createPortal(children, el.current)
})

Portal.displayName = 'Portal'
