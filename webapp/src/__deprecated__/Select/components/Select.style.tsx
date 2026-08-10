import styled from '@emotion/styled'
import { maxHeight, MaxHeightProps } from 'styled-system'

import { FlexBox } from '~/shared/components/Base/FlexBox'

export const StyledSelect = styled(FlexBox)<{
  isOpen: boolean
  hasValue: boolean
  clearable: boolean
}>`
  width: 100%;
  height: 36px;
  transition: ${(props) => props.theme.transition};
  border: 1px solid
    ${(props) =>
      props.isOpen || (props.hasValue && props.clearable)
        ? props.theme.colors.purple9
        : props.theme.colors.purple11};
  border-radius: 4px;
  background-color: ${(props) =>
    props.isOpen || (props.hasValue && props.clearable)
      ? props.theme.colors.purple7
      : 'transparent'};
  cursor: pointer;
  &:hover {
    border-color: ${(props) => props.theme.colors.purple9};
  }
`

export const StyledSelectList = styled('ul')<MaxHeightProps>`
  position: absolute;
  top: 42px;
  left: 0;
  z-index: 100;
  width: 100%;
  height: auto;
  border-top: 1px solid ${(props) => props.theme.colors.purple9};
  border-bottom: 1px solid ${(props) => props.theme.colors.purple9};
  background-color: ${(props) => props.theme.colors.black};
  overflow: auto;
  ${maxHeight}
  &.isAscending {
    top: auto;
    bottom: 42px;
  }
`

export const SelectListItem = styled('li')<{
  isSelected: boolean
  disabled: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 36px;
  padding-left: 12px;
  transition: ${(props) => props.theme.transition};
  border-right: 1px solid;
  border-bottom: 1px solid;
  border-left: 1px solid;
  border-color: ${(props) => props.theme.colors.purple9};
  background-color: ${(props) =>
    props.isSelected ? props.theme.colors.purple7 : 'transparent'};
  color: ${(props) =>
    props.disabled ? props.theme.colors.purple7 : props.theme.colors.white};
  font-family: ${(props) => props.theme.fontFamilies.condensed};
  font-size: 16px;
  &:last-child {
    border-bottom: none;
  }

  ${({ theme }) => theme.mediaQueries.large} {
    &:hover {
      background-color: ${(props) =>
        props.disabled ? 'transparent' : props.theme.colors.purple7};
    }
  }
`
