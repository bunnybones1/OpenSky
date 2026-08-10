import styled from '@emotion/styled'
import * as copy from 'copy-to-clipboard'
import { lighten } from 'polished'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnmount } from 'react-use'

import env from '~/env'
import { Box, FlexBox } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'

export const PublicSpectateCode = memo(() => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  const [copyText, setCopyText] = useState<string | null>(null)

  const { data: activeAccount } = useActiveAccount()

  const spectateLink = useMemo(() => {
    if (!activeAccount?.address) return ''
    return `${env.GAME_URL}?mode=SPECTATE&spectateCode=${activeAccount.address}`
  }, [activeAccount?.address])

  const { t } = useTranslation()

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

  useUnmount(() => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current)
    }
  })

  return (
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
          <Icon type="link-public" height="16px" color="white" />
        </Box>
        <SpectateInput ref={inputRef} type={'text'} value={spectateLink} readOnly />
      </FlexBox>
      <ButtonWrapper
        alignItems="center"
        justifyContent="flex-end"
        flexWrap="nowrap"
        pl={2}
      >
        <Button
          frameType="default"
          colorType="default"
          leftAdornment={{ icon: !copyText ? 'copy' : undefined }}
          text={copyText ?? t('general.Copy')}
          onClick={onCopy}
          data-id="copy-public-spectate-code"
        />
      </ButtonWrapper>
    </FlexBox>
  )
})

PublicSpectateCode.displayName = 'PublicSpectateCode'

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
