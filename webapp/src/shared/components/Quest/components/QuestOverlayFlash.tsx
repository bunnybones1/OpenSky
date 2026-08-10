import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestOverlayFlashStyle } from './QuestOverlayFlash.css'

interface QuestOverlayProps {
  isNew?: boolean
  isClaimed?: boolean
}

export const QuestOverlayFlash = memo(({ isNew, isClaimed }: QuestOverlayProps) => {
  const { getAssetUrl } = useGetAssetContext()

  const previousIsNew = useRef(false)
  const isNewFlashTimeout = useRef<number | null>(null)
  const [flashIsNew, setFlashIsNew] = useState(!!isNew)

  const previousIsClaimed = useRef(false)
  const isClaimedFlashTimeout = useRef<number | null>(null)
  const [flashIsClaimed, setFlashIsClaimed] = useState(false)

  useLayoutEffect(() => {
    if (!!isNew && !previousIsNew.current) {
      // If isNew change to true, flash the orange overlay
      setFlashIsNew(true)

      if (isNewFlashTimeout.current) window.clearTimeout(isNewFlashTimeout.current)

      isNewFlashTimeout.current = window.setTimeout(() => {
        setFlashIsNew(false)
      }, 600)
    }
  }, [isNew])

  useLayoutEffect(() => {
    if (!!isClaimed && !previousIsClaimed.current) {
      // If isClaimed changes to true, flash the white overlay
      setFlashIsClaimed(true)

      if (isClaimedFlashTimeout.current) {
        window.clearTimeout(isClaimedFlashTimeout.current)
      }

      isClaimedFlashTimeout.current = window.setTimeout(() => {
        setFlashIsClaimed(false)
      }, 600)
    }
  }, [isClaimed])

  useEffect(() => {
    return () => {
      if (!!isClaimedFlashTimeout.current) {
        window.clearTimeout(isClaimedFlashTimeout.current)
      }
      if (!!isNewFlashTimeout.current) {
        window.clearTimeout(isNewFlashTimeout.current)
      }
    }
  }, [])

  if (!getAssetUrl) return null

  return (
    <AnimatePresence>
      {!!flashIsNew && (
        <motion.img
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.25, ease: 'easeInOut' }
          }}
          src={getAssetUrl('webapp/misc/quest-new-flash.webp')}
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'absolute',
              left: 0,
              top: 0
            }),
            'isNew',
            QuestOverlayFlashStyle
          )}
        />
      )}
      {!!flashIsClaimed && (
        <motion.img
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.25, ease: 'easeInOut' }
          }}
          src={getAssetUrl('webapp/misc/quest-claim-flash.webp')}
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'absolute',
              left: 0,
              top: 0
            }),
            QuestOverlayFlashStyle
          )}
        />
      )}
    </AnimatePresence>
  )
})

QuestOverlayFlash.displayName = 'QuestOverlayFlash'
