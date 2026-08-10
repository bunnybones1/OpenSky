import styled from '@emotion/styled'
import * as copy from 'copy-to-clipboard'
import { lighten } from 'polished'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnmount } from 'react-use'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { Box, FlexBox } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ConfirmResetSpectatorCodeDialog } from './components/ConfirmResetSpectatorCodeDialog'
import { useSpectateCode } from './queries/useSpectateCode'
import { CONFIRM_RESET_CODE_DIALOG_ID } from './shared/constants'

export const SpectateCode = memo(() => {
  const { data: spectateCode } = useSpectateCode()
  const { userAddress } = useSnapshot(authenticationState)
  const { Dialog, openDialog } = useDialog({
    Element: ConfirmResetSpectatorCodeDialog,
    id: CONFIRM_RESET_CODE_DIALOG_ID
  })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const resetTimerRef = useRef<number | null>(null)
  const codeRef = useRef<string | undefined>(spectateCode)

  const [copyText, setCopyText] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [wasReset, setWasReset] = useState(false)

  const { t } = useTranslation()

  useEffect(() => {
    const showWasReset = () => {
      codeRef.current = spectateCode
      setWasReset(true)
      resetTimerRef.current = window.setTimeout(() => {
        setWasReset(false)
      }, 2000)
    }

    if (!codeRef.current && !!spectateCode) {
      codeRef.current = codeRef.current = spectateCode
    } else if (
      !!codeRef.current &&
      !!spectateCode &&
      codeRef.current !== spectateCode
    ) {
      showWasReset()
    }
  }, [spectateCode])

  const spectateLink = useMemo(() => {
    if (!spectateCode || !userAddress) return ''
    return `${env.GAME_URL}?mode=SPECTATE&spectateCode=${userAddress}.${spectateCode}`
  }, [spectateCode, userAddress])

  const toggleCodeVisibility = useCallback(() => {
    setShown((_shown) => !_shown)
  }, [])

  const onCopy = useCallback(() => {
    if (inputRef.current) {
      const value = inputRef.current.value
      copy['default'](value)
      setCopyText(`${t('general.Copied')}!`)
      copyTimerRef.current = window.setTimeout(() => {
        setCopyText(null)
      }, 2000)
    }
  }, [t])

  const onReset = useCallback(() => {
    openDialog()
  }, [openDialog])

  useUnmount(() => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current)
    }
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
    }
  })

  return (
    <>
      <FlexBox
        width="100%"
        alignItems="center"
        justifyContent="flex-start"
        flexWrap="nowrap"
      >
        <FlexBox flex={1} alignItems="center" position="relative">
          <Box
            position="absolute"
            top="50%"
            style={{
              transform: 'translateY(-50%)'
            }}
            left="8px"
          >
            <Icon type="link-secret" height="16px" color="white" />
          </Box>
          <SpectateInput
            ref={inputRef}
            type={shown ? 'text' : 'password'}
            value={spectateLink}
            readOnly
          />
        </FlexBox>
        <ButtonWrapper
          alignItems="center"
          justifyContent="flex-end"
          flexWrap="nowrap"
        >
          <Button
            frameType="default"
            colorType="default"
            leftAdornment={{ icon: !copyText ? 'copy' : undefined }}
            text={copyText ?? t('general.Copy')}
            onClick={onCopy}
            data-id="copy-public-spectate-code"
            className={Sprinkles({ marginLeft: '4px' })}
          />
          <Button
            frameType="default"
            colorType="default"
            leftAdornment={{ icon: shown ? 'eye-closed' : 'eye' }}
            text={t(`general.${shown ? 'Hide' : 'Show'}`)}
            onClick={toggleCodeVisibility}
            className={Sprinkles({ marginLeft: '4px' })}
          />
          <Button
            frameType="default"
            colorType="default"
            leftAdornment={{ icon: !wasReset ? 'link-reset' : undefined }}
            text={t(`profile.spectate.${wasReset ? 'wasReset' : 'resetButton'}`)}
            onClick={onReset}
            className={Sprinkles({ marginLeft: '4px' })}
          />
        </ButtonWrapper>
      </FlexBox>
      {Dialog}
    </>
  )
})

const ButtonWrapper = styled(FlexBox)`
  .spectateControl {
    margin-left: 8px;
  }
`

const SpectateInput = styled.input`
  width: 100%;
  height: 36px;
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  padding-left: 30px;
  padding-right: 8px;
  font-family: ${(props) => props.theme.fontFamilies.condensed};
  font-size: 16px;
  font-weight: 500;
  color: white;
  outline: none;
  background-image: linear-gradient(to bottom, #0c061e, #261747);
  border-color: ${(props) => props.theme.colors.purple7};
  &:hover {
    border-color: ${(props) => lighten(0.1, props.theme.colors.purple7)};
  }
`

SpectateCode.displayName = 'SpectateCode'
