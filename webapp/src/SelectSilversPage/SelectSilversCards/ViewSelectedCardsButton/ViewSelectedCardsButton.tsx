import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { Portal } from '~/shared/components/Portal'
import { Text } from '~/shared/components/Text'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import {
  ViewOrderButtonBadge,
  ViewOrderButtonGradient,
  ViewOrderButtonStyle
} from '~/shared/style/ViewCartButtonStyle.css'

import { BurnSilversDialog } from './BurnSilversDialog/BurnSilversDialog'

export const ViewSelectedCardsButton = memo(() => {
  const { Dialog, openDialog } = useDialog({
    Element: BurnSilversDialog,
    id: 'aDADADW'
  })
  const isTabletWide = useResponsiveQuery('tabletWide')
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const { selectedCards } = useSnapshot(selectSilversState)

  const onClick = useCallback(() => {
    openDialog()
  }, [openDialog])

  useLayoutEffect(() => {
    if (badgeRef.current && !timerRef.current) {
      badgeRef.current.style.transform = 'scale(1.6)'
      timerRef.current = window.setTimeout(() => {
        if (!!badgeRef.current) {
          badgeRef.current.style.transform = 'scale(1)'
        }
        timerRef.current = null
      }, 200)
    }
  }, [selectedCards.length])

  useEffect(() => {
    return () => {
      if (!!timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const { t } = useTranslation()

  return (
    <>
      {Dialog}
      <Portal>
        <div
          className={clsx(
            Sprinkles({
              position: 'fixed',
              bottom: 0,
              right: 0,
              pointerEvents: 'none'
            }),
            ViewOrderButtonStyle
          )}
        >
          <AnimatePresence>
            {!!selectedCards.length && (
              <>
                <motion.div
                  animate={{ translateY: 0, opacity: 1 }}
                  exit={{ translateY: 80, opacity: 0 }}
                  initial={{ translateY: 80, opacity: 0 }}
                  className={Sprinkles({
                    paddingBottom: '20px',
                    paddingRight: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    zIndex: 2
                  })}
                >
                  <div
                    ref={badgeRef}
                    className={clsx(
                      Sprinkles({
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'purple9',
                        border: '1px solid',
                        borderColor: 'purple1',
                        zIndex: 2
                      }),
                      ViewOrderButtonBadge
                    )}
                  >
                    <Text fontSize="14px" color="black" fontWeight="600">
                      {selectedCards.length}
                    </Text>
                  </div>
                  <Button
                    frameType="default"
                    colorType="blue"
                    onClick={onClick}
                    text={t('play.ViewSelected')}
                    leftAdornment={{ icon: 'cart' }}
                    height={isTabletWide ? '52px' : '36px'}
                  />
                </motion.div>
                <motion.div
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  className={Sprinkles({
                    position: 'absolute',
                    zIndex: 1,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start'
                  })}
                >
                  <div
                    className={clsx(
                      Sprinkles({
                        position: 'absolute',
                        zIndex: 1
                      }),
                      ViewOrderButtonGradient
                    )}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </Portal>
    </>
  )
})

ViewSelectedCardsButton.displayName = 'ViewSelectedCardsButton'
