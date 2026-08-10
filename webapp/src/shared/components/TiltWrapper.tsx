import { memo, ReactNode } from 'react'
import Tilt from 'react-parallax-tilt'

interface TiltWrapperProps {
  isEnabled: boolean
  children: ReactNode
}

export const TiltWrapper = memo(({ isEnabled, children }: TiltWrapperProps) => {
  return (
    <Tilt
      tiltEnable={isEnabled}
      tiltReverse={true}
      tiltMaxAngleX={10}
      tiltMaxAngleY={10}
    >
      {children}
    </Tilt>
  )
})

TiltWrapper.displayName = 'TiltWrapper'
