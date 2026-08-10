import { isMobileBrowser, isNativeMobileApp } from '@opensky/shared/native'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Theme } from '~/__deprecated__/style/Theme'
import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Portal } from '~/shared/components/Portal'
import { useIsPortrait } from '~/shared/hooks/ui/useIsPortrait'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSelector } from '~/shared/redux'
import { isRootRouteSelector } from '~/shared/redux/router/selectors'

const LandscapeWarning = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const isRootRoute = useSelector(isRootRouteSelector)
  const { t } = useTranslation()
  const isPortrait = useIsPortrait()

  const renderLandscapeWarning =
    !isPortrait && !isNativeMobileApp() && isMobileBrowser() && isRootRoute

  return (
    <Portal>
      {renderLandscapeWarning && !!getAssetUrl && (
        <FlexBox
          position="fixed"
          type="centered-column"
          height="100%"
          width="100%"
          px={4}
          top={0}
          left={0}
          zIndex={100}
          style={{
            background: `url('${getAssetUrl('webapp/backgrounds/clouds.webp')}') ${
              Theme.colors.black
            }`,
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover'
          }}
        >
          <Box width="80%" pb="100%">
            <img
              style={{ width: '100%' }}
              src={getAssetUrl('webapp/icons/logo.webp')}
            />
          </Box>
          <FlexBox
            position="fixed"
            top="50%"
            left="50%"
            zIndex={2}
            type="centered-column"
            style={{
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Box width="60%" pb={3}>
              <img
                style={{
                  width: '100%',
                  transform: 'rotate(90deg) scale(-1,1)'
                }}
                src={getAssetUrl('webapp/icons/rotate-device.webp')}
              />
            </Box>
            <Text fontSize={4} color="purple9" textWrap={true} textAlign="center">
              {t('portraitWarning')}
            </Text>
          </FlexBox>
        </FlexBox>
      )}
    </Portal>
  )
})

LandscapeWarning.displayName = 'LandscapeWarning'

export default LandscapeWarning
