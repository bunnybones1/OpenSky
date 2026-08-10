import styled from '@emotion/styled'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

interface Props extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
  hasValue: boolean
  onClick?(): void
}

const StyledSubmitButton = styled('button')`
  margin-right: ${(props) => props.theme.space[1]}px;
  margin-left: ${(props) => props.theme.space[1]}px;
  transition: ${(props) => props.theme.transition};
  border: 1px solid ${(props) => props.theme.colors.purple9};
  border-radius: 4px;
  background: transparent;
  color: ${(props) => props.theme.colors.purple9};
  font-family: ${(props) => props.theme.fontFamilies.condensed};
  font-size: 16px;
  cursor: pointer;
  &:hover {
    border-color: ${(props) => props.theme.colors.white};
    color: ${(props) => props.theme.colors.white};
  }
`

const InputSubmit = (props: Props) => {
  const { hasValue, disabled, onClick, ...rest } = props
  const { t } = useTranslation()

  if (!hasValue || !onClick) {
    return null
  }

  return (
    <StyledSubmitButton
      disabled={disabled}
      onClick={onClick}
      type="submit"
      data-id="inputSubmitButton"
      {...rest}
    >
      {t('general.submit')}
    </StyledSubmitButton>
  )
}

export default InputSubmit
