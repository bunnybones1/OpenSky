import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestHoverStyle } from './QuestHover.css'

interface QuestHoverProps {
  isClaimable?: boolean
  isClaimed?: boolean
  isNew?: boolean
}

export const QuestHover = memo(
  ({ isClaimable, isNew, isClaimed }: QuestHoverProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const src = useMemo(() => {
      if (isNew) return 'webapp/misc/quest-hover-new.webp'
      if (isClaimable) return 'webapp/misc/quest-hover-blue.webp'
      return null
    }, [isClaimable, isNew])

    if (isClaimable) {
      if (!getAssetUrl || !src || !!isClaimed) return null

      return (
        <img
          src={getAssetUrl(src)}
          className={clsx(
            Sprinkles({
              width: 'full',
              opacity: 0,
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 1
            }),
            QuestHoverStyle,
            FadeInImageStyle
          )}
        />
      )
    }
    return (
      <AnimatePresence>
        {!!getAssetUrl && !isClaimed && !!src && isNew && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            key={src}
            src={getAssetUrl(src)}
            className={clsx(
              Sprinkles({
                width: 'full',
                opacity: 0,
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 1
              }),
              QuestHoverStyle
            )}
          />
        )}
      </AnimatePresence>
    )
  }
)

QuestHover.displayName = 'QuestHover'
