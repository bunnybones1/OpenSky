import styled from '@emotion/styled'
import { isMobileBrowser } from '@opensky/shared/native'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMount } from 'react-use'

import { Text } from '~/__deprecated__/Text'
import env from '~/env'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Portal } from '~/shared/components/Portal'
import { page, trackButtonClick } from '~/shared/helpers/analytics-old'
import { getIsStandalone } from '~/shared/helpers/get-is-standalone'
import { useIsIOSDevice } from '~/shared/hooks/ui/useIsIOSDevice'
import { useIsPortrait } from '~/shared/hooks/ui/useIsPortrait'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

const MobileAppPrompt = memo(() => {
  const { t } = useTranslation()
  const isPortrait = useIsPortrait()
  const isIOSDevice = useIsIOSDevice()
  const isStandalone = getIsStandalone()
  const { getAssetUrl } = useGetAssetContext()

  useMount(() => {
    const renderWarning = !isStandalone && isMobileBrowser()

    if (renderWarning) {
      page('Install OpenSky')
    }
  })

  const handleClickDownloadLink = () => {
    trackButtonClick('Install Mobile App Button')

    if (isIOSDevice) {
      window.open(
        'https://apps.apple.com/us/app/opensky/id1469294062?ls=1',
        '_blank'
      )

      return
    }

    window.open(
      'https://play.google.com/store/apps/details?id=net.opensky.android',
      '_blank'
    )
  }

  const handleWaitlistClick = () => {
    trackButtonClick('Join Waitlist Button')
    window.open('https://www.skyweaver.net/#early-access')
  }

  const renderWarning = !isStandalone && isMobileBrowser()

  const backgroundImageUrl = isPortrait
    ? 'mobile-install-cover-portrait.webp'
    : 'mobile-install-cover-landscape.webp'

  if (!renderWarning) {
    return null
  }

  const bypass = !!new URL(window.location.href).searchParams.get('bypassAppRedirect')
  if ((env.DEBUG && bypass) || window.location.host.includes('localhost')) {
    return null
  }

  // If we're on a mobile device and we aren't using the local wallet, we should proceed with the webapp as normal.
  if (isMobileBrowser()) {
    return null
  }

  return (
    <Portal>
      <MobileAppPromptContainer
        className={clsx({ isPortrait })}
        width="100%"
        height="100%"
        position="fixed"
        top={0}
        left={0}
        zIndex={100}
        type="centered-start-column"
        bg="purple1"
        flexWrap="nowrap"
      >
        {!!getAssetUrl && (
          <FlexBox
            position="absolute"
            top="0px"
            left="0px"
            width="100%"
            height="100%"
            style={{
              backgroundImage: `url(${getAssetUrl(
                `webapp/backgrounds/${backgroundImageUrl}`
              )})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top',
              backgroundSize: 'cover'
            }}
          />
        )}

        <FlexBox
          className="contentContainer"
          flex={1}
          zIndex={2}
          justifyContent="flex-start"
          flexDirection="column"
          width="100%"
        >
          {!!getAssetUrl && (
            <img
              src={getAssetUrl('webapp/icons/logo@2x.webp')}
              className="mobileAppPromptLogo"
              style={{
                objectFit: 'contain',
                height: '70px',
                margin: '30px auto 0px auto'
              }}
            />
          )}

          {(!isIOSDevice || isPortrait) && (
            <Text
              textAlign="center"
              color="white"
              width="70%"
              margin="0 auto"
              style={{ whiteSpace: 'normal' }}
              fontFamily="condensed"
              className="tagline"
            >
              {t('dashboard.tagline')}
            </Text>
          )}
        </FlexBox>

        <FlexBox
          flexDirection="column"
          alignItems="center"
          zIndex={2}
          mb={80}
          mt={2}
          width="100%"
          flexWrap="nowrap"
        >
          <FlexBox
            bg="white"
            className="watiListButton"
            height={44}
            type="centered-row"
            width={140}
            borderRadius={5}
            onClick={handleWaitlistClick}
          >
            <Text
              color="black"
              className="waitListButton_text"
              fontSize={16}
              fontWeight="600"
              fontFamily="condensed"
            >
              {t('mobileInstallPrompt.waitList')}
            </Text>
          </FlexBox>
          <Text mt={20} color="white" fontSize={14}>
            {t('mobileInstallPrompt.alreadyHave')}
          </Text>
          <Text
            mt={1}
            color="white"
            fontSize={14}
            className="downloadLink"
            onClick={handleClickDownloadLink}
          >
            {t('mobileInstallPrompt.download')}
          </Text>
        </FlexBox>
      </MobileAppPromptContainer>
    </Portal>
  )
})

const MobileAppPromptContainer = styled(FlexBox)`
  img {
    pointer-events: auto !important;
  }

  .tagline {
    margin-top: 10px;
    font-size: 24px;
    font-weight: 500;
  }

  .mobileAppPromptLogo {
    height: 64px;
  }

  &.isPortrait {
    .mobileAppPromptLogo {
      height: 72px;
      margin-top: 20px;
    }
    .watiListButton {
      height: 52px;
      width: 180px;
    }

    .waitListButton_text {
      font-size: 20px;
    }

    .tagline {
      margin-top: 10px;
      font-weight: 400;
    }
  }
  .downloadLink {
    text-decoration: underline;
  }
`

export default MobileAppPrompt

MobileAppPrompt.displayName = 'MobileAppPrompt'
