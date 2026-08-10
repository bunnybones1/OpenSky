import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { lighten } from 'polished'

import { FlexBox } from '~/shared/components/Base/FlexBox'

const getWrapperBorderColor = (props) => {
  let borderColor = props.theme.colors.purple7
  if (props.isErrored) borderColor = props.theme.colors.warm4
  if (props.isInvalid) borderColor = props.theme.colors.warm7
  return css`
    border-color: ${borderColor};
    &:hover {
      border-color: ${lighten(0.1, borderColor)};
    }
  `
}

export const StyledInput = styled('input')<{ isSmallScreen?: boolean }>`
  display: flex;
  flex: 1;
  width: 100%;
  padding: 0;
  border: none;
  padding: 0px 8px;
  outline: none;
  background: transparent;
  color: ${(props) => props.theme.colors.white};
  font-family: ${(props) => props.theme.fontFamilies.condensed};
  font-weight: 500;
  font-size: 16px;
  -moz-appearance: textfield;
  &::placeholder {
    color: ${(props) => props.theme.colors.purple7};
  }
  ::-webkit-inner-spin-button,
  ::-webkit-outer-spin-button {
    -webkit-appearance: none;
    -moz-appearance: none;
    margin: 0;
  }
`

interface InputWrapperProps {
  rounded?: boolean
  isInvalid?: boolean
  isErrored?: boolean
}

export const InputWrapper = styled(FlexBox)<InputWrapperProps>`
  transition: ${(props) => props.theme.transition};
  border-width: ${(props) => (props.rounded ? '1px' : '0px 0px 1px 0px')};
  border-style: solid;
  border-radius: ${(props) => (props.rounded ? '4px' : 0)};
  ${getWrapperBorderColor};
  &.showBg {
    background-image: linear-gradient(to bottom, #0c061e, #261747);
  }
`
