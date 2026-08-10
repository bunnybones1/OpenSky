import clsx from 'clsx'
import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useIsVisible } from '../hooks/ui/useIsVisible'
import { ItemNewBadgeInner, ItemNewBadgeWrapper } from './ItemNewBadge.css'
import { Text } from './Text'

interface ItemNewBadgeProps {
  isNew: boolean
  className?: Parameters<typeof clsx>[0]
  onHide: () => void
  text?: string
}

const FontSize = { base: '12px', tabletWide: '14px' } as const

export const ItemNewBadge = memo(
  ({ isNew, onHide, text, className }: ItemNewBadgeProps) => {
    const badgeRef = useRef<HTMLDivElement | null>(null)
    const { isVisible } = useIsVisible(badgeRef)
    const isVisibleRef = useRef(isVisible)
    const isHiddenRef = useRef(!isNew)
    const { t } = useTranslation()

    useEffect(() => {
      if (!isVisible && !!isVisibleRef.current && !isHiddenRef.current) {
        // The badge was visible, and now is not.
        onHide()
        isHiddenRef.current = true
      }
      isVisibleRef.current = isVisible
    }, [isVisible, onHide])

    useEffect(() => {
      return () => {
        if (isVisibleRef.current && !isHiddenRef.current) {
          onHide()
        }
      }
    }, [onHide])

    if (!isNew) return null

    return (
      <div
        ref={badgeRef}
        className={clsx(
          Sprinkles({
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'purple1'
          }),
          ItemNewBadgeWrapper,
          className
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'warm6'
            }),
            ItemNewBadgeInner
          )}
        >
          <Text fontWeight="700" color="purple1" fontSize={FontSize}>
            {text || t('generic.NEW')}
          </Text>
        </div>
      </div>
    )
  }
)

ItemNewBadge.displayName = 'ItemNewBadge'
