import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { memo, useRef } from 'react'

import { FlashIn, JustFlash } from '~/__deprecated__/style/animations'
import { Box } from '~/shared/components/Base/Box'

import { attachMagicExplosion } from './attachMagicExplosion'

interface Props {
  children: React.ReactNode
  explosionEffect?: boolean
  explosionEffectVisibleStart?: boolean
  isReadyToAnimate?: boolean
  explosionEffectDelay?: number
  flare?: boolean
}

export const MagicExplosionWrapper = memo(
  ({
    children,
    explosionEffect = false,
    explosionEffectVisibleStart = false,
    explosionEffectDelay = 0,
    isReadyToAnimate,
    flare = false
  }: Props) => {
    const containerRef = useRef<HTMLDivElement | null>(null)

    if (explosionEffect) {
      attachMagicExplosion(containerRef, explosionEffectDelay, flare)
    }

    return (
      <FlashInContainer
        willReveal={explosionEffect}
        playReveal={explosionEffect && !!isReadyToAnimate}
        startTransparent={!explosionEffectVisibleStart}
        ref={containerRef}
        animationDelay={explosionEffectDelay * 0.001}
      >
        {children}
      </FlashInContainer>
    )
  }
)

const FlashInContainer = styled(Box)<{
  playReveal: boolean
  willReveal: boolean
  startTransparent: boolean
  animationDelay: number
}>`
  height: 100%;
  width: 100%;
  position: relative;
  z-index: 3;
  opacity: ${(props) => (props.willReveal && props.startTransparent ? 0 : 1)};
  animation: ${(props) =>
    props.playReveal
      ? css`
          ${props.startTransparent ? FlashIn : JustFlash} + 0.5s ease-in forwards;
        `
      : ''};
  animation-delay: ${(props) => props.animationDelay}s;
`

MagicExplosionWrapper.displayName = 'MagicExplosionWrapper'
