import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Portal } from '~/shared/components/Portal'
import { Text } from '~/shared/components/Text'
import { useCartSideItems } from '~/shared/hooks/cart/useCartSideItems'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import {
  ViewOrderButtonBadge,
  ViewOrderButtonGradient,
  ViewOrderButtonStyle
} from '~/shared/style/ViewCartButtonStyle.css'

import { CartDialog } from './CartDialog/CartDialog'
import { useCartMode } from './hooks/useCartMode'
import { CART_DIALOG_ID } from './shared/constants'

export const ViewOrderButton = memo(() => {
  const mode = useCartMode()
  const cart = useCartSideItems(mode)
  const isDesktop = useResponsiveQuery('desktop')
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)

  const { Dialog, openDialog } = useDialog({
    Element: CartDialog,
    id: CART_DIALOG_ID,
    mode
  })

  const onClick = useCallback(() => {
    if (!mode) {
      return
    }
    openDialog()
  }, [mode, openDialog])

  const cartCount = useMemo(() => {
    if (!cart) return undefined

    return cart.reduce((prev, curr) => {
      if (!curr) return prev
      return prev + curr.amount
    }, 0)
  }, [cart])

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
  }, [cartCount])

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
            {!!cartCount && (
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
                      {cartCount}
                    </Text>
                  </div>
                  <Button
                    frameType="default"
                    colorType="blue"
                    onClick={onClick}
                    text={t('shop.reviewOrder')}
                    leftAdornment={{ icon: 'cart' }}
                    // To me, 76px feels too big, but this was changed to match designs, see:
                    // https://github.com/horizon-games/issue-tracker/issues/7940
                    height={isDesktop ? '76px' : '52px'}
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
      {Dialog}
    </>
  )
})

ViewOrderButton.displayName = 'ViewOrderButton'
