import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo, useState } from 'react'
import * as React from 'react'
import Clipboard from 'react-clipboard.js'
import { useTranslation } from 'react-i18next'
import {
  height as _height,
  HeightProps,
  width as _width,
  WidthProps
} from 'styled-system'

import { Button, ButtonStyleKeys } from '~/__deprecated__/Button'
import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'

interface Props
  extends WidthProps,
    HeightProps,
    React.HTMLAttributes<HTMLDivElement> {
  value: string
  label?: string
  successLabel?: string
  isDisabled?: boolean
  labelComponent?: (copied: boolean) => JSX.Element
  onSuccess?(): void
  defaultButtonStyle?: ButtonStyleKeys
}

const CopyButton = memo(
  ({
    label,
    successLabel,
    width,
    height,
    labelComponent,
    isDisabled,
    value,
    onSuccess,
    defaultButtonStyle,
    ...props
  }: Props) => {
    let copiedTimeout: number | undefined
    const [copied, updateCopied] = useState(false)

    const handleCopySuccess = () => {
      updateCopied(true)
      if (onSuccess) onSuccess()
      clearTimeout(copiedTimeout)
      copiedTimeout = window.setTimeout(() => {
        updateCopied(false)
      }, 3500)
    }

    const { t } = useTranslation()

    return (
      <StyledCopy
        data-clipboard-text={value}
        component="div"
        disabled={true}
        onSuccess={handleCopySuccess}
        className={clsx({ isDisabled })}
        width={width || 55}
        height={height || 32}
        {...props}
      >
        <Button
          height="100%"
          width="100%"
          onClick={() => false}
          disabled={isDisabled}
          buttonStyle={copied ? 'play' : defaultButtonStyle ?? 'default'}
        >
          <FlexBox
            height="100%"
            width="100%"
            type="centered-row"
            position="absolute"
            left={0}
            top={0}
            zIndex={2}
          >
            {!!labelComponent ? (
              labelComponent(copied)
            ) : (
              <Text
                color="white"
                fontSize={[3, 3, 4, 4]}
                fontFamily="condensed"
                className="copyButtonText"
              >
                {copied
                  ? successLabel || t('general.Copied')
                  : label || t('general.Copy')}
              </Text>
            )}
          </FlexBox>
        </Button>
      </StyledCopy>
    )
  },
  (props, prevProps) =>
    props.value === prevProps.value && props.isDisabled === prevProps.isDisabled
)

const StyledCopy = styled<any>(Clipboard)`
  ${_width}
  ${_height}
  &.isDisabled {
    pointer-events: none;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  padding: 0;
  border: none;
  outline: none;
  background: none;
`

CopyButton.displayName = 'CopyButton'

export default CopyButton
