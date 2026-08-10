import styled from '@emotion/styled'
import { motion } from 'framer-motion'
import { memo } from 'react'

import { loop, opacity } from '~/__deprecated__/style/animations'
import { ThemeColorType } from '~/__deprecated__/style/types'
import { Box } from '~/shared/components/Base/Box'

export interface GlowInterface {
  duration?: number
  repeatType?: 'mirror' | 'reverse' | 'loop'
  borderRadius?: string
  blur?: string
  spread?: string
  color?: ThemeColorType
}

export const Glow = memo(
  ({
    duration = 2,
    repeatType = 'mirror',
    borderRadius,
    blur = '12px',
    spread = '0px',
    color = 'purple8'
  }: GlowInterface) => {
    return (
      <GlowBox
        spread={spread}
        blur={blur}
        color={color}
        {...loop({ duration, repeatType, type: 'spring' })}
        {...opacity()}
        style={{
          borderRadius: borderRadius ? borderRadius : '0px',
          willChange: 'opacity'
        }}
      />
    )
  }
)

Glow.displayName = 'Glow'

const GlowBox = styled(motion(Box))<{
  spread: string
  blur: string
  color: ThemeColorType
}>`
  position: absolute;
  width: 100%;
  height: 100%;
  box-shadow: ${(props) =>
    `0px 0px ${props.blur} ${props.spread} ${props.theme.colors[props.color]}`};
  top: 0px;
  left: 0px;
  z-index: 1;
`

export default Glow
