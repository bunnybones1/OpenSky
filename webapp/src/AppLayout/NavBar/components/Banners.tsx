import { Banner } from '@opensky/proto'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback } from 'react'
//@ts-ignore
import sanitize from 'sanitize-html'

import { Text } from '~/__deprecated__/Text'
import { BannerType } from '~/lib/proto'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { BANNERS } from '~/shared/constants/react-query-keys'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { getSafeAreaInsets } from '~/shared/helpers/get-safe-area-insets'
import { useIsIOSDevice } from '~/shared/hooks/ui/useIsIOSDevice'
import { useBanners } from '~/shared/queries/useBanners'

import { DISCLAIMER_HEIGHT } from '../../../shared/constants/ui'

const Banners = memo(() => {
  const queryClient = useQueryClient()
  const isIOSDevice = useIsIOSDevice()

  const { data: banners } = useBanners()

  const activeDisclaimer = banners && banners.length > 0

  const dismissBanner = useCallback(() => {
    if (activeDisclaimer) {
      if (!banners?.length) return
      window.localStorage.setItem(`DISCLAIMER_IGNORE_${banners[0].id}`, 'true')
      queryClient.setQueryData<Banner[] | undefined>(BANNERS, (data) => {
        if (!data) return
        return data.filter((banner) => banner.id !== banners[0].id)
      })
    } else {
      window.localStorage.setItem('AMBASSADOR_GIVEAWAY', 'true')
    }
  }, [activeDisclaimer, banners, queryClient])

  if (!activeDisclaimer) {
    return null
  }

  const type =
    banners && banners.length > 0 && banners[0].type
      ? banners[0].type
      : BannerType.INFO

  const ConditionalLink = ({ children }) =>
    activeDisclaimer && banners[0] && banners[0].link ? (
      <a href={banners[0].link} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <>{children}</>
    )

  const devicePadding = getSafeAreaInsets()

  const leftPadding = !isIOSDevice
    ? `${NAVBAR_WIDTH}px - ${devicePadding.left}px`
    : '0px'

  const mobileWidth = `calc(100vw - ${leftPadding} - ${devicePadding.right}px)`

  return (
    <>
      <ConditionalLink>
        <FlexBox
          position={['absolute', 'absolute', 'absolute', 'relative']}
          top={[0]}
          left={[`${NAVBAR_WIDTH}px`, `${NAVBAR_WIDTH}px`, `${NAVBAR_WIDTH}px`, 0]}
          width={[mobileWidth, mobileWidth, mobileWidth, '100%']}
          pl={[`16px`]}
          bg={banners?.[0].color}
          height={DISCLAIMER_HEIGHT}
          zIndex={14}
          pr={20}
          justifyContent="flex-start"
          alignItems="center"
          style={{
            borderBottom: '1px solid',
            borderColor: 'black'
          }}
          data-id="disclaimerBanner"
          data-banner-type={type}
        >
          <Text
            color="white"
            fontSize={[14, 14, 16]}
            pl={2}
            textWrap={true}
            width="calc(100% - 60px)"
          >
            {/* InnerHTML is set here but sanitized, please do not remove html sanitizing, and allowedStyles must only ever accept color attribute */}
            {activeDisclaimer && (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitize(banners[0].msg, {
                    allowedTags: ['span', 'i', 'strong'],
                    allowedAttributes: {
                      span: ['style'],
                      i: ['style'],
                      strong: ['style']
                    },
                    allowedStyles: {
                      '*': {
                        // Match HEX and RGB
                        color: [
                          /^#(0x)?[0-9a-f]+$/i,
                          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
                        ]
                      }
                    }
                  })
                }}
              />
            )}
          </Text>
        </FlexBox>
      </ConditionalLink>
      <Box
        position="fixed"
        top="4px"
        right={`calc(${devicePadding.right}px + 2px)`}
        height={36}
        width={36}
        zIndex={20}
        onClick={dismissBanner}
        data-id="disclaimerClose"
      >
        <FlexBox width="100%" height="100%" type="centered-row">
          <Icon type="close" height="20px" color="white" />
        </FlexBox>
      </Box>
    </>
  )
})

Banners.displayName = 'Banners'

export default Banners
