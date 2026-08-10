import { memo } from 'react'

import { FlexBox } from '~/shared/components/Base'
import { Portal } from '~/shared/components/Portal'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { useSelector } from '~/shared/redux'
import { isHomeRouteSelector } from '~/shared/redux/router/selectors'

import { WalletWidget } from './components/WalletWidget'
import { GameCacheWidget } from './GameCacheWidget/GameCacheWidget'
import { MatchMakerWidget } from './MatchMakerWidget/MatchMakerWidget'

export const Widgets = memo(() => {
  const isHomeRoute = useSelector(isHomeRouteSelector)

  return (
    <Portal>
      <FlexBox
        zIndex={16}
        position="fixed"
        top="0px"
        pb={[8, 8, 8, 24]}
        left={[
          `calc(env(safe-area-inset-left, 0px) + ${NAVBAR_WIDTH + 8}px)`,
          `calc(env(safe-area-inset-left, 0px) + ${NAVBAR_WIDTH + 8}px)`,
          `calc(env(safe-area-inset-left, 0px) + ${NAVBAR_WIDTH + 8}px)`,
          `calc(env(safe-area-inset-left, 0px) + 16px)`
        ]}
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="flex-end"
        height="100%"
        style={{
          pointerEvents: 'none'
        }}
      >
        <MatchMakerWidget />
        {isHomeRoute && <GameCacheWidget />}
        <WalletWidget />
      </FlexBox>
    </Portal>
  )
})

Widgets.displayName = 'Widgets'
