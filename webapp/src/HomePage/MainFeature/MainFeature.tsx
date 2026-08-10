import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, FlexBox } from '~/shared/components/Base'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

import { GraphicBox } from '../shared/components/GraphicBox'
import { CornerFrame } from './components/CornerFrame'
import { Description, Title, TitleDescriptor } from './components/ScalableText'
import { TitleIcon } from './components/TitleIcon'

export const MainFeature = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')

  return (
    <GraphicBox
      bgImage={
        !!getAssetUrl
          ? getAssetUrl('webapp/backgrounds/exbg-hexinv-cover.webp')
          : undefined
      }
      dataId="main-feature"
      showTopLeftGraphic
      showBottomRightGraphic
      showTopRightGraphic
    >
      <FlexBox width="100%" height="100%" position="relative">
        <MainFeatureBottomGradient />
        <FlexBox
          position="absolute"
          bottom={['29.5%', '29.5%', '29.5%', '25.5%']}
          left={0}
          height={['5.88%', '5.88%', '5.88%', '3.16%']}
          alignItems="center"
          justifyContent="flex-start"
          flexDirection="row"
          flexWrap="nowrap"
          paddingLeft="3%"
          zIndex={2}
          width="100%"
        >
          {/* Using the Icon component here, and setting the height to 100% causes weird display bugs on Firefox */}
          <TitleIcon />
          <TitleDescriptor
            textToRender={t('home.mainFeatureSkypass.titleDescription')}
          />
        </FlexBox>
        <FlexBox
          position="absolute"
          left={0}
          paddingLeft="2.8%"
          height={['13.97%', '13.97%', '13.97%', '8.3%']}
          bottom={['19.5%', '19.5%', '19.5%', '15%']}
          zIndex={2}
          style={{
            fontSize: !isTabletWide ? '32px' : '56px'
          }}
          width={'700px'}
        >
          <Title textToRender={t('home.mainFeatureSkypass.title')} />
        </FlexBox>
        <FlexBox
          position="absolute"
          left={0}
          paddingLeft="3%"
          height={['15.74%', '15.74%', '15.74%', '8.7%']}
          bottom="4.5%"
          zIndex={2}
          style={{
            fontSize: !isTabletWide ? '12px' : '18px'
          }}
          width={'700px'}
        >
          <Description
            firstLineOfText={t('home.mainFeatureSkypass.descriptionLineOne')}
            secondLineOfText={t('home.mainFeatureSkypass.descriptionLineTwo')}
          />
        </FlexBox>
        <FlexBox
          position="absolute"
          bottom={0}
          left={0}
          height={['33%', '33%', '33%', '27%']}
          color="purple8"
        >
          <CornerFrame />
        </FlexBox>
      </FlexBox>
    </GraphicBox>
  )
})

const MainFeatureBottomGradient = styled(Box)`
  width: 100%;
  height: 100%;
  background: linear-gradient(0deg, #0c061e 0%, rgba(12, 6, 30, 0) 36.4%),
    radial-gradient(
      38.88% 75.18% at 15.21% 100%,
      rgba(12, 6, 30, 0.8) 48.6%,
      rgba(12, 6, 30, 0) 96.09%
    );
`

MainFeature.displayName = 'MainFeature'
