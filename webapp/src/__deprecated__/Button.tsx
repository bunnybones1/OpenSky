import styled from '@emotion/styled'
import { forwardRef as _forwardRef } from 'react'
import * as React from 'react'
import { height as _height, width as _width } from 'styled-system'

import { Theme } from '~/__deprecated__/style/Theme'

import { Box } from '../shared/components/Base/Box'
import { FlexBox } from '../shared/components/Base/FlexBox'
import { AngledBox, Props as AngledBoxProps } from './AngledBox'
import { Text } from './Text'

type SizeType = string | number | Array<string | number>

export type ButtonStyleKeys =
  | 'default'
  | 'secondary'
  | 'accentBlue'
  | 'play'
  | 'error'
  | 'accentOrange'
  | 'disabled'
  | 'warm'

const BUTTON_BGS = {
  defaultButtonBg: `linear-gradient(to bottom, #4d3c7b 0%, #4d3c7b 
      29%, #4d3c7b 49%, #3e2f67 50%, #3e2f67 100%)`,
  defaultButtonBgHover: `linear-gradient(to bottom, #5b4792 0%, #5b4792 
      29%, #5b4792 49%, #523f86 50%, #523f86 100%)`,
  defaultButtonBorder: '#8e73d8',
  defaultButtonBorderHover: '#d0c0ff',
  defaultButtonHit: '#ac8fff',
  defaultButtonHitBorder: '#c5b4f5',
  defaultButtonGlow: '#5e3eb9',
  secondaryButtonBg: `linear-gradient(to bottom, #2e2152 0%, #2e2152 
      29%, #2e2152 49%, #241844 50%, #241844 100%)`,
  secondaryButtonBgHover: `linear-gradient(to bottom, #3e3068 0%, #3e3068 
      29%, #3e3068 49%, #33255b 50%, #33255b 100%)`,
  secondaryButtonBorder: '#8e73d8',
  secondaryButtonBorderHover: '#d0c0ff',
  secondaryButtonHit: '#ac8fff',
  secondaryButtonHitBorder: '#c5b4f5',
  secondaryButtonGlow: '#5e3eb9',
  accentBlueButtonBg: `linear-gradient(to bottom, #0081b2 0%, #0081b2 
      29%, #0081b2 49%, #006b93 50%, #006b93 100%)`,
  accentBlueButtonBgHover: `linear-gradient(to bottom, #008fc5 0%, #008fc5 
      29%, #008fc5 49%, #007faf 50%, #007faf 100%)`,
  accentBlueButtonBorder: '#00d7fd',
  accentBlueButtonBorderHover: '#9ef0ff',
  accentBlueButtonHit: '#00d7fd',
  accentBlueButtonHitBorder: '#9ef0ff',
  accentBlueButtonGlow: '#006a93',
  accentOrangeButtonBg: `radial-gradient(36.04% 104.73% at 50% 100%, #FDB000 0%, #FEAB03 0.01%, rgba(253, 176, 0, 0) 100%), linear-gradient(180deg, #DE7717 46.09%, #BC4918 46.78%)`,
  accentOrangeButtonBgHover: `radial-gradient(36.04% 104.73% at 50% 100%, #FEC339 0%, #FEC339 0.01%, rgba(253, 176, 0, 0) 100%), linear-gradient(180deg, #EA913E 46.09%, #E5622A 46.78%)`,
  accentOrangeButtonBorder: '#ea9b02',
  accentOrangeButtonBorderHover: '#FDD100',
  accentOrangeButtonHit: '#FDB000',
  accentOrangeButtonHitBorder: '#ea9b02',
  accentOrangeButtonGlow: '#e86e02',
  playButtonBg: `linear-gradient(to bottom, #2c9355 0%, #2c9355 
      29%, #2c9355 49%, #25874c 50%, #25874c 100%)`,
  playButtonBgHover: `linear-gradient(to bottom, #3eb06b 0%, #3eb06b 
      29%, #3eb06b 49%, #309d5b 50%, #309d5b 100%)`,
  playButtonBorder: '#4be788',
  playButtonBorderHover: '#86fbb4',
  playButtonHit: '#4be788',
  playButtonHitBorder: '#4be788',
  playButtonGlow: '#14a65e',
  errorButtonBg: `linear-gradient(to bottom, #eb2828 0%, #eb2828 
      29%, #eb2828 49%, #cd1313 50%, #cd1313 100%)`,
  errorButtonBgHover: `linear-gradient(to bottom, #ef5757 0%, #ef5757 
      29%, #ef5757 49%, #eb2828 50%, #eb2828 100%)`,
  errorButtonBorder: '#f48686',
  errorButtonBorderHover: '#f8b4b4',
  errorButtonHit: '#f48686',
  errorButtonHitBorder: '#f48686',
  errorButtonGlow: '#ef5757',
  warmButtonBg: Theme.colors.warm1,
  warmButtonBgHover: Theme.colors.warm2,
  warmButtonBorder: Theme.colors.warm9,
  warmButtonBorderHover: Theme.colors.warm9,
  warmButtonHit: Theme.colors.warm3,
  warmButtonHitBorder: Theme.colors.warm9,
  warmButtonGlow: Theme.colors.warm4
}

export interface Props
  extends Pick<React.HTMLProps<HTMLButtonElement>, 'type' | 'onClick'> {
  height?: SizeType
  width?: SizeType
  isBig?: boolean
  disabled?: boolean
  bg?: string
  type?: 'button' | 'submit' | 'reset'
  buttonStyle?: ButtonStyleKeys
  angledBoxProps?: AngledBoxProps
  className?: string
  as?: 'button' | 'div'
  children?: any
  nestInAngledBox?: boolean
  renderArrow?: boolean
  buttonId?: string
}

/**
 * @deprecated Use ~/shared/components/Button
 */
export const Button = _forwardRef<HTMLButtonElement, Props>(
  (
    {
      disabled,
      className,
      as,
      height,
      width,
      buttonStyle = 'default',
      type,
      onClick,
      angledBoxProps,
      children,
      nestInAngledBox = false,
      renderArrow = false,
      buttonId,
      ...props
    },
    forwardRef
  ) => {
    // Set angledBox stroke colour based on buttonStyle
    const newAngledBoxProps = { ...angledBoxProps }
    if (!angledBoxProps || (angledBoxProps && !angledBoxProps.strokeColour)) {
      newAngledBoxProps.strokeColour = buttonStyle + 'Border'
    }

    return (
      <StyledButton
        as={(as || 'button') as any}
        className={className}
        height={height || 'auto'}
        width={width || 'auto'}
        buttonStyle={buttonStyle}
        type={type}
        disabled={disabled}
        onClick={onClick}
        ref={forwardRef}
        data-button-id={buttonId}
        {...props}
      >
        <Box
          position="absolute"
          left={0}
          top={0}
          height="100%"
          width="100%"
          zIndex={1}
        >
          <AngledBox {...newAngledBoxProps}>
            {nestInAngledBox && children}{' '}
            {renderArrow && (
              <ArrowContainer buttonStyle={buttonStyle}>
                <Arrow />
              </ArrowContainer>
            )}
          </AngledBox>
        </Box>
        {!nestInAngledBox && (
          <Box
            top="1px"
            left="1px"
            right="1px"
            bottom="1px"
            zIndex={2}
            position="absolute"
          >
            {React.isValidElement(children) ? (
              children
            ) : (
              <FlexBox type="centered-row" width="100%" height="100%">
                <Text
                  color={disabled ? 'purple7' : 'white'}
                  fontSize={[3, 3, 3, 3]}
                  fontFamily="condensed"
                  className="buttonText"
                >
                  {children}
                </Text>
              </FlexBox>
            )}
          </Box>
        )}
      </StyledButton>
    )
  }
)

Button.displayName = 'Button'

interface StyledButtonProps {
  height: SizeType
  width: SizeType
  buttonStyle?: ButtonStyleKeys
  disabled?: boolean
  as?: any
}

const StyledButton = styled('button')<StyledButtonProps>`
  ${_height}
  ${_width}
  user-select: none;
  position: relative;
  border: none;
  outline: none;
  background: none;
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  &.black-text {
    .buttonText {
      color: black !important;
    }
    .sequence-platforms-text {
      color: black !important;
    }
  }
  .angledBox {
    transition: 0.125s ease-in-out;
    background: ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonBorder`]};
    filter: drop-shadow(
      0 0 0 ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonGlow`]}
    );
  }
  .angledBox .angledBoxInner {
    transition: 0.125s ease-in-out;
    background: ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonBg`]};
  }
  &:hover:not(:disabled),
  &.focused {
    .angledBox {
      background: ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonBorderHover`]};
      filter: drop-shadow(
        0 0 10px 1px ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonGlow`]}
      );
      .angledBoxInner {
        background: ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonBgHover`]};
      }
    }
  }
  &:active:not(:disabled) {
    .angledBox {
      background: ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonHitBorder`]};
      filter: drop-shadow(
        0 0 10px 1px ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonGlow`]}
      );
      .angledBoxInner {
        background: ${(props) => BUTTON_BGS[`${props.buttonStyle}ButtonHit`]};
      }
    }
  }
  &:disabled {
    .angledBox {
      background: ${(props) => props.theme.colors.purple7};
      .angledBoxInner {
        background: ${(props) => props.theme.colors.purple3};
      }
    }

    div {
      color: ${({ theme }) => theme.colors.purple7} !important;
    }

    .icon > svg {
      fill: ${({ theme }) => theme.colors.purple7} !important;
    }
  }
`

const ArrowContainer = styled(Box)<{ buttonStyle?: ButtonStyleKeys }>`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  height: 100%;
  width: 24px;
  z-index: 3;
  top: 0px;
  right: 0px;
  background: ${(props) => BUTTON_BGS[props.buttonStyle + 'ButtonBg']};
  border-left: 1px solid ${(props) => BUTTON_BGS[props.buttonStyle + 'ButtonBorder']};
`

const Arrow = styled(Box)`
  width: 0px;
  height: 0px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid white;
`
