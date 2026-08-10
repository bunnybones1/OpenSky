import styled from '@emotion/styled'
import { memo } from 'react'

import { Box } from '~/shared/components/Base'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface AuthBackgroundProps {
  children: React.ReactNode
}

const AuthBackground = memo(({ children }: AuthBackgroundProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const isTabletWide = useResponsiveQuery('tabletWide')

  return (
    <>
      {isTabletWide && (
        <PreAuthSplashInfo
          type="centered-column"
          width="100%"
          minHeight="900px"
          height="100%"
          overflow="hidden"
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('webapp/backgrounds/newhome.webp')})`
              : undefined,
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            transition: 'background 0.125s ease-in'
          }}
        >
          <Gradient />
          <Box
            style={{
              zIndex: 10,
              position: 'absolute',
              top: '100px',
              width: '100%'
            }}
          >
            {children}
          </Box>
        </PreAuthSplashInfo>
      )}
      {!isTabletWide && (
        <Box style={{ position: 'relative', zIndex: 10, width: '100%' }}>
          <PreAuthSplashInfo
            type="centered-column"
            width="100%"
            height="400px"
            top={NAVBAR_HEIGHT}
            overflow="hidden"
            style={{
              backgroundImage: !!getAssetUrl
                ? `url(${getAssetUrl('webapp/backgrounds/newhome.webp')})`
                : undefined,
              backgroundSize: 'calc(100% + 400px)',
              backgroundPositionX: '-200px',
              backgroundPositionY: '50%',
              transition: 'background 0.125s ease-in',
              zIndex: 10,
              position: 'relative'
            }}
          >
            <MobileGradient />
          </PreAuthSplashInfo>
          <Box
            style={{
              zIndex: 10,
              position: 'absolute',
              top: '24px',
              width: '100%'
            }}
          >
            {children}
          </Box>
        </Box>
      )}
    </>
  )
})

AuthBackground.displayName = 'AuthBackground'

const Gradient = styled(Box)`
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(12, 6, 30, 1) 0%,
    rgba(12, 6, 30, 1) 5%,
    rgba(12, 6, 30, 0) 50%,
    rgba(12, 6, 30, 1) 95%
  );
`

const MobileGradient = styled(Box)`
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(12, 6, 30, 1) 0%,
    rgba(12, 6, 30, 1) 12%,
    rgba(12, 6, 30, 0.5) 30%,
    rgba(12, 6, 30, 0) 40%,
    rgba(12, 6, 30, 0) 50%,
    rgba(12, 6, 30, 0) 60%,
    rgba(12, 6, 30, 1) 90%
  );
`

const PreAuthSplashInfo = styled(FlexBox)`
  position: relative;
  .startButton {
    img {
      -webkit-filter: brightness(100%);
      filter: brightness(100%);
      transition: filter 0.125s ease;
    }
    &:hover {
      img {
        -webkit-filter: brightness(120%);
        filter: brightness(120%);
      }
    }
  }
`

export default AuthBackground
