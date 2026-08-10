import styled from '@emotion/styled'
import clsx from 'clsx'
import { ComponentType, memo, ReactNode } from 'react'

import { SoundClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

interface HomeFeaturesProps {
  MainFeature?: ComponentType
  SecondaryFeature?: ReactNode
  SmallFeatureOne?: ComponentType
  SmallFeatureTwo?: ComponentType
  SmallFeatureThree?: ComponentType
}

export const HomeFeatures = memo(
  ({
    MainFeature,
    SecondaryFeature,
    SmallFeatureOne,
    SmallFeatureTwo,
    SmallFeatureThree
  }: HomeFeaturesProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')

    return (
      <FlexBox
        width="100%"
        maxWidth="1472px"
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="flex-start"
        data-id="main-feature"
      >
        <FeatureGridWrapper className={clsx({ isMobile: !isTabletWide })}>
          <FeatureGrid className={clsx({ isMobile: !isTabletWide })}>
            <FlexBox
              style={{ gridArea: 'Main-Feature' }}
              alignItems="center"
              justifyContent="center"
              height={['75vh', '75vh', '75vh', '100%']}
              width="100%"
              maxHeight={['300px', '300px', '300px', '100%']}
              onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
            >
              {!!MainFeature && <MainFeature />}
            </FlexBox>
            <FlexBox
              width="100%"
              height="100%"
              style={{ gridArea: 'Feature-2' }}
              alignItems="center"
              justifyContent="center"
              onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
            >
              {!!SecondaryFeature && SecondaryFeature}
            </FlexBox>
            <FlexBox
              alignItems="center"
              justifyContent="center"
              width="100%"
              height="100%"
              style={{ gridArea: 'News-1' }}
              onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
            >
              {!!SmallFeatureOne && <SmallFeatureOne />}
            </FlexBox>
            <FlexBox
              alignItems="center"
              justifyContent="center"
              width="100%"
              height="100%"
              style={{ gridArea: 'News-2' }}
              onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
            >
              {!!SmallFeatureTwo && <SmallFeatureTwo />}
            </FlexBox>
            <FlexBox
              alignItems="center"
              justifyContent="center"
              width="100%"
              height="100%"
              style={{ gridArea: 'News-3' }}
              onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
            >
              {!!SmallFeatureThree && <SmallFeatureThree />}
            </FlexBox>
          </FeatureGrid>
        </FeatureGridWrapper>
      </FlexBox>
    )
  }
)

const FeatureGrid = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 16px;
  display: grid;
  grid-auto-columns: 1fr;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 16px 16px;
  grid-template-areas:
    'Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Feature-2 Feature-2 Feature-2'
    'Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Feature-2 Feature-2 Feature-2'
    'Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Feature-2 Feature-2 Feature-2'
    'Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Feature-2 Feature-2 Feature-2'
    'Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Main-Feature Feature-2 Feature-2 Feature-2'
    'News-1 News-1 News-1 News-1 News-2 News-2 News-2 News-2 News-3 News-3 News-3 News-3'
    'News-1 News-1 News-1 News-1 News-2 News-2 News-2 News-2 News-3 News-3 News-3 News-3';
  &.isMobile {
    position: relative;
    top: unset;
    right: unset;
    bottom: unset;
    left: unset;
    grid-auto-columns: 1fr;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 154px 154px;
    gap: 16px 16px;
    grid-template-areas:
      'Main-Feature Main-Feature'
      'News-3 Feature-2'
      'News-1 News-2';
  }
`

const FeatureGridWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: calc((833 / 1472) * 100%);
  &.isMobile {
    padding-top: 0px;
  }
`

HomeFeatures.displayName = 'HomeFeatures'
