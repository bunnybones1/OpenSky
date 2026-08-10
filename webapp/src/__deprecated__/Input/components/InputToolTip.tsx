import styled from '@emotion/styled'
import { darken } from 'polished'
import * as React from 'react'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  toolTip?: string
  isErrored?: boolean
  toolTipDirection?: 'top' | 'bottom'
  tooltipMiddle?: boolean
  renderArrow?: boolean
}

const InputToolTip = ({
  toolTip,
  isErrored,
  toolTipDirection,
  tooltipMiddle,
  renderArrow = true,
  ...props
}: Props) => {
  if (!toolTip) return null
  return (
    <StyledInputTipBox
      position="absolute"
      top={toolTipDirection === 'bottom' ? 'calc(100% + 16px)' : 'auto'}
      right={tooltipMiddle ? undefined : 0}
      left={tooltipMiddle ? '50%' : undefined}
      bottom={toolTipDirection === 'bottom' ? 'auto' : 'calc(100% + 16px)'}
      border="1px solid"
      borderColor={isErrored ? 'warm4' : 'purple7'}
      p={2}
      height={'auto'}
      type="centered-row"
      isErrored={isErrored}
      zIndex={100}
      transform={tooltipMiddle ? 'translateX(-50%)' : undefined}
      {...props}
    >
      {renderArrow && toolTipDirection === 'bottom' && <ArrowUp />}
      {renderArrow && toolTipDirection === 'top' && <ArrowDown />}
      <TooltipText
        fontSize={2}
        fontWeight={'500'}
        color="white"
        fontFamily="primary"
        whiteSpace="break-spaces"
      >
        {toolTip}
      </TooltipText>
    </StyledInputTipBox>
  )
}

const TooltipText = styled(Text)`
  white-space: break-spaces;
  overflow: unset;
`

const StyledInputTipBox = styled(FlexBox)<{ isErrored?: boolean }>`
  background-color: ${(props) =>
    props.isErrored
      ? props.theme.colors['warm4']
      : darken(0.4, props.theme.colors['purple5'])};
  width: 100%;
  border-radius: 4px;
`

const ArrowUp = styled(FlexBox)`
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: ${(props) => `6px solid ${props.theme.colors['warm4']};`};
  top: -7px;
  left: 20px;
  position: absolute;
`

const ArrowDown = styled(FlexBox)`
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;

  border-top: ${(props) => `6px solid ${props.theme.colors['warm4']};`};
  bottom: -7px;
  left: 20px;
  position: absolute;
`

export default InputToolTip
