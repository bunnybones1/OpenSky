import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { Portal } from '~/shared/components/Portal'
import { useSelector } from '~/shared/redux/index'
import { isHeroFeatureRouteSelector } from '~/shared/redux/router/selectors'
import { toastState } from '~/shared/state/toast-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { deckViewerDeckStringSelector } from '../AppLayout/DeckViewer/shared/selectors'
import { Toast } from './component/Toast'
import { ToastsStyle, ToastWrapper } from './Toasts.css'

export const Toasts = memo(() => {
  const deckViewerDeckString = useSelector(deckViewerDeckStringSelector)
  const isHeroFeatureRoute = useSelector(isHeroFeatureRouteSelector)

  const toasts = useSnapshot(toastState)

  const _toasts = Array.from(toasts.values())

  return (
    <Portal>
      <div
        className={clsx(
          Sprinkles({
            position: 'fixed',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            pointerEvents: 'none',
            alignItems: 'flex-start',
            paddingTop: '8px'
          }),
          ToastsStyle,
          {
            isCentered: isHeroFeatureRoute,
            isOnTopOfDeckViewer: !!deckViewerDeckString
          }
        )}
      >
        <AnimatePresence mode="popLayout">
          {_toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ scaleY: 0.4, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              className={clsx(
                Sprinkles({
                  border: '1px solid',
                  borderColor: 'purple9',
                  pointerEvents: 'all',
                  backgroundColor: 'purple2',
                  width: 'full',
                  height: 'auto'
                }),
                ToastWrapper
              )}
            >
              <Toast {...toast} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Portal>
  )
})

Toasts.displayName = 'Toasts'
