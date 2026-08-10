import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { FlexBox } from '~/shared/components/Base'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

import {
  HERO_FEATURE_SELECTOR_HEIGHT,
  MOBILE_HERO_FEATURE_SELECTOR_HEIGHT
} from '../shared/constants'
import { getHeroDataArray } from '../shared/helpers'
import { HeroFeatureSelectButton } from './components/HeroFeatureSelectButton'

interface HeroFeatureSelectorProps {
  id: number
}

export const HeroFeatureSelector = memo(({ id }: HeroFeatureSelectorProps) => {
  const heroData = useMemo(() => {
    return getHeroDataArray(id)
  }, [id])
  const isTabletWide = useResponsiveQuery('tabletWide')

  return (
    <FlexBox
      width="100%"
      height={[
        MOBILE_HERO_FEATURE_SELECTOR_HEIGHT,
        MOBILE_HERO_FEATURE_SELECTOR_HEIGHT,
        HERO_FEATURE_SELECTOR_HEIGHT
      ]}
      type="centered-row"
      bg="purple4"
      borderTop="1px solid"
      borderColor="purple5"
      px="8px"
    >
      <HeroFeatureSelectButtonWrapper
        className={clsx({ isNotDesktop: !isTabletWide })}
      >
        {heroData.map((hero) => (
          <HeroFeatureSelectButton
            key={hero.id}
            id={hero.id}
            artId={hero.artID}
            isActive={id === hero.id}
          />
        ))}
      </HeroFeatureSelectButtonWrapper>
    </FlexBox>
  )
})

const HeroFeatureSelectButtonWrapper = styled.div`
  width: 100%;
  height: 100%;
  max-width: 1730px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  grid-auto-rows: 100%;
  gap: 0px 8px;
`

HeroFeatureSelector.displayName = 'HeroFeatureSelector'
