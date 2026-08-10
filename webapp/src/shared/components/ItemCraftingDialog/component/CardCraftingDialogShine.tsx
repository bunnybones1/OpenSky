import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useRef } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardCraftingDialogShineStyle } from './CardCraftingDialogShine.css'

interface CardCraftingDialogShine {
  isVisible: boolean
  onHide: () => void
}

export const CardCraftingDialogShine = memo(
  ({ isVisible, onHide }: CardCraftingDialogShine) => {
    const timerRef = useRef<number | null>(null)
    useEffect(() => {
      if (isVisible) {
        timerRef.current = window.setTimeout(() => {
          onHide()
        }, 1200)
      } else {
        if (timerRef.current) window.clearTimeout(timerRef.current)
      }
    }, [isVisible, onHide])

    useEffect(() => {
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current)
      }
    }, [])

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ease: 'easeInOut', delay: 1, duration: 0.2 }}
            className={clsx(
              Sprinkles({
                position: 'absolute'
              }),
              CardCraftingDialogShineStyle
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              viewBox="0 0 81 24"
              fill="none"
            >
              <rect
                x="-1.52588e-05"
                y="2.66663"
                width="80.9804"
                height="21.3333"
                fill="url(#paint0_radial_1879_55960)"
              />
              <defs>
                <radialGradient
                  id="paint0_radial_1879_55960"
                  cx="0"
                  cy="0"
                  r="1"
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="translate(40.4902 13.3333) rotate(90) scale(10.6667 40.4902)"
                >
                  <stop stopColor="#D8E3FF" />
                  <stop offset="1" stopColor="#9747FF" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)

CardCraftingDialogShine.displayName = 'CardCraftingDialogShine'
