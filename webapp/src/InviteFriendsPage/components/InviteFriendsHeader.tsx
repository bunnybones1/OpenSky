import styled from '@emotion/styled'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import CopyButton from '~/shared/components/CopyButton'
import { CurrentSeasonStickerPack } from '~/shared/components/CurrentSeasonStickerPack/CurrentSeasonStickerPack'
import { Icon } from '~/shared/components/Icon/Icon'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { authenticationState } from '~/shared/state/authentication-state'

const IconHeight = { base: '12px', tabletWide: '14px' } as const

export const InviteFriendsHeader = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { userAddress } = useSnapshot(authenticationState)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const isTablet = useResponsiveQuery('tablet')

  const goBackHome = useCallback(() => {
    navigate(ROUTES_CONFIG.routes.HOME.directPath)
  }, [navigate])

  const inviteUrl = useMemo(() => {
    const rootUrl = `${window.location.protocol}//${window.location.host}`.replace(
      /\/$/,
      ''
    )
    return `${rootUrl}?invitedBy=${userAddress}`
  }, [userAddress])

  const copyLabel = useCallback(
    (copied: boolean) => {
      return (
        <FlexBox
          width="100%"
          height="100%"
          alignItems="center"
          justifyContent="center"
        >
          {copied ? (
            <Text
              fontFamily="condensed"
              fontWeight="medium"
              color="white"
              fontSize={22}
            >
              {t('generic.COPIED')}
            </Text>
          ) : (
            <>
              <Icon type="copy" height="16px" color="white" />
              <Text
                fontFamily="condensed"
                fontWeight="medium"
                color="white"
                fontSize={22}
                ml="6px"
              >
                {t('generic.copyInviteURL')}
              </Text>
            </>
          )}
        </FlexBox>
      )
    },
    [t]
  )

  return (
    <InviteFriendsHeaderWrapper
      width="100%"
      flexDirection="column"
      alignItems="flex-start"
      justifyContent="flex-start"
      pl={[24, 24, 24, 48]}
      bg="purple3"
      pt={[16, 16, 16, 70]}
      pb={[32, 32, 32, 40]}
      borderBottom="1px solid"
      borderColor="purple7"
      url={
        !!getAssetUrl
          ? getAssetUrl('webapp/backgrounds/Nightsky-Promo-zoom.webp')
          : ''
      }
      position="relative"
      overflow="hidden"
    >
      <Box
        position={isTabletWide ? 'absolute' : 'initial'}
        top="8px"
        left="8px"
        mb="8px"
      >
        <Button
          frameType="leftCorner"
          colorType="default"
          text={t('general.Back')}
          leftAdornment={{ icon: 'arrow-back' }}
          onClick={goBackHome}
        />
      </Box>
      <Text
        maxWidth={[340, 467, 467, 877]}
        textWrap
        fontSize={[28, 36, 36, 44]}
        fontFamily="condensed"
        fontWeight="medium"
        color="white"
      >
        {t('inviteFriends.header')}
      </Text>
      <FlexBox type="centered-start-row" alignItems="center" mt={8}>
        <SubHeaderText
          color="white"
          fontSize={[18, 20, 20, 28]}
          fontFamily="condensed"
          fontWeight="extraBold"
          textWrap
          dangerouslySetInnerHTML={{
            __html: t('inviteFriends.subHeader')
          }}
        />
        {!!getAssetUrl && (
          <img
            style={{
              width: !isTablet ? '32px' : '40px',
              margin: '0 4px 0 6px'
            }}
            src={getAssetUrl('webapp/icons/sticker-points.webp')}
            alt="sticker"
          />
        )}
        <Text
          color="cold8"
          fontSize={[18, 20, 20, 28]}
          fontFamily="condensed"
          fontWeight="extraBold"
          transform="lowercase"
          textWrap
        >
          {t('dashboard.stickers.stickerPoints')}
        </Text>
      </FlexBox>
      <FlexBox
        flexDirection={['row', 'row', 'row', 'column']}
        alignItems={['center', 'center', 'center', 'flex-start']}
        justifyContent="flex-start"
        mt={24}
      >
        <CopyButton
          value={inviteUrl}
          width={[180, 180, 180, 204]}
          height={[44, 44, 44, 52]}
          labelComponent={copyLabel}
          defaultButtonStyle="accentBlue"
        />
        <FlexBox alignItems="center" justifyContent="flex-start" mt={[0, 0, 0, 12]}>
          <Box display={['none', 'none', 'none', 'block']}>
            <Icon type="arrow-left-up" height={IconHeight} color="cold8" />
          </Box>
          <Text
            fontSize={[12, 12, 12, 14]}
            color="cold8"
            ml={[10, 10, 10, '6px']}
            fontWeight="medium"
            maxWidth={[148, 148, 148, 'unset']}
            textWrap
          >
            {t('inviteFriends.shareCTA')}
          </Text>
        </FlexBox>
      </FlexBox>
      <FlexBox
        position="absolute"
        right={[-64, -44, -44, 44]}
        top="50%"
        style={{
          transform: 'translateY(-50%)'
        }}
        width={[220, 260, 260, 312]}
        height={[181, 214, 214, 256]}
      >
        <CurrentSeasonStickerPack />
      </FlexBox>
    </InviteFriendsHeaderWrapper>
  )
})

const SubHeaderText = styled(Text)`
  span {
    color: ${(props) => props.theme.colors.forest5};
  }
  span:first-of-type {
    color: ${(props) => props.theme.colors.cold7};
  }
`

const InviteFriendsHeaderWrapper = styled(FlexBox)<{ url: string }>`
  background-size: 100% !important;
  background-repeat: no-repeat;
  background: linear-gradient(to bottom, rgba(28, 16, 56, 0.7), rgba(23, 13, 48, 0.9)),
    url(${(props) => props.url});
  background-position-y: 50%;
`

InviteFriendsHeader.displayName = 'InviteFriendsHeader'
