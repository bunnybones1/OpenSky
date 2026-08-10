import styled from '@emotion/styled'
import { isIOSNativeApp } from '@opensky/shared/check-mobile-app-type'
import { memo, useMemo } from 'react'

import { FlexBox, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { GraphicBox } from '../shared/components/GraphicBox'

interface GenericFeatureProps {
  bgImageKey: string
  titleText: string
}

const showIcon = isIOSNativeApp()

export const GenericFeature = memo(
  ({ bgImageKey, titleText }: GenericFeatureProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const isTabletWide = useResponsiveQuery('tabletWide')

    const cornerHeight = useMemo(() => {
      if (isTabletWide) {
        return '13%'
      }
      return '55%'
    }, [isTabletWide])

    return (
      <GraphicBox
        bgImage={!!getAssetUrl ? getAssetUrl(bgImageKey) : undefined}
        showTopLeftGraphic
        showTopRightGraphic
        cornerHeight={cornerHeight}
        dataId="generic-feature"
      >
        <FlexBox
          width="100%"
          height="100%"
          flexDirection="column"
          alignItems="flex-end"
          justifyContent="flex-end"
        >
          <GenericFeatureTextWrapper
            px={[16, 16, 16, 24]}
            pb={[16, 16, 16, 24]}
            pt={48}
            alignItems="center"
            justifyContent="flex-start"
            width="100%"
          >
            <Text
              textWrap
              color="white"
              fontSize={isTabletWide ? 32 : [16, 16, 16, 24]}
              fontFamily="condensed"
              fontWeight="extraBold"
              mr="4px"
            >
              {titleText}
            </Text>
            {showIcon && <Icon type="external" color="white" height="20px" />}
          </GenericFeatureTextWrapper>
        </FlexBox>
      </GraphicBox>
    )
  }
)

const GenericFeatureTextWrapper = styled(FlexBox)`
  .sequence-platforms-text {
    text-transform: uppercase;
  }
  background: linear-gradient(
    0deg,
    #0c061e 0%,
    rgba(12, 6, 30, 0.55) 76.39%,
    rgba(12, 6, 30, 0) 100%
  );
`

GenericFeature.displayName = 'GenericFeature'
