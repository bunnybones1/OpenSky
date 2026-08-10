import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo } from 'react'
import * as React from 'react'

import { Theme } from '~/__deprecated__/style/Theme'

export interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  stroke?: number
  cornerDisabled?: 'right' | 'left'
  flippedVertical?: boolean
  children?: React.ReactNode
  cornerSize?: number
  strokeColour?: string
  disableRightBorder?: boolean
}

// Goals: Look the same as AngledBox but:
// - Clip out contents []
// - Allow disabling of the top right corner []
// - Dont require set height and width []

const getFlippedClipPath = (
  cornerDisabled?: 'left' | 'right',
  cornerSize?: number
) => {
  const isRightDisabled = cornerDisabled === 'right'
  const isLeftDisabled = cornerDisabled === 'left'
  return `
    0% 100%,
    calc(100% - ${cornerSize}px) 100%,
    100% ${isRightDisabled ? '100%' : `calc(100% - ${cornerSize}px)`},
    100% 0%,
    ${isLeftDisabled ? '0%' : `${cornerSize}px`} 0%,
    0% ${isLeftDisabled ? '0%' : `${cornerSize}px`}
    `
}

const getClipPath = (cornerDisabled?: 'left' | 'right', cornerSize?: number) => {
  const isRightDisabled = cornerDisabled === 'right'
  const isLeftDisabled = cornerDisabled === 'left'
  return `
    0% 0%,
    ${isRightDisabled ? '100%' : `calc(100% - ${cornerSize}px)`} 0%,
    100% ${isRightDisabled ? '0%' : `${cornerSize}px`},
    100% 100%,
    ${isLeftDisabled ? '0%' : `${cornerSize}px`} 100%,
    0% ${isLeftDisabled ? '100%' : `calc(100% - ${cornerSize}px)`}
  `
}
/**
 * @deprecated Use ~/shared/components/AngledBox
 */
export const AngledBox = memo(
  ({
    children,
    className,
    stroke,
    flippedVertical,
    cornerDisabled,
    cornerSize = 6,
    strokeColour = 'purple7',
    disableRightBorder = false,
    ...props
  }: Props) => {
    const clipFunc = flippedVertical ? getFlippedClipPath : getClipPath

    const path = clipFunc(cornerDisabled, cornerSize)

    return (
      <AngledBoxWrapper
        className={clsx('angledBox', className)}
        style={{
          clipPath: `polygon(${path})`,
          WebkitClipPath: `polygon(${path})`,
          backgroundColor: Theme.colors[strokeColour]
        }}
        {...props}
      >
        <AngledBoxInner
          className="angledBoxInner"
          style={{
            clipPath: `polygon(${path})`,
            WebkitClipPath: `polygon(${path})`,
            top: stroke ? `${stroke}px` : '1px',
            right: stroke ? `${stroke}px` : disableRightBorder ? '0px' : '1px',
            bottom: stroke ? `${stroke}px` : '1px',
            left: stroke ? `${stroke}px` : '1px'
          }}
        >
          {children}
        </AngledBoxInner>
      </AngledBoxWrapper>
    )
  }
)

const AngledBoxWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
  width: 100%;
  height: 100%;
  background-color: ${(props) => props.theme.colors.purple7};
  transition: all 0.2s ease-in-out;
`

const AngledBoxInner = styled.div`
  position: absolute;
  background-color: ${(props) => props.theme.colors.purple4};
`

AngledBox.displayName = 'AngledBox'
