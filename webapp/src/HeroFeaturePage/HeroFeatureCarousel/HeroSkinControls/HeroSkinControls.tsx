import styled from '@emotion/styled'
import clsx from 'clsx'
import { motion, useAnimationControls } from 'framer-motion'
import { memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebounce } from 'react-use'
import { useSnapshot } from 'valtio'

import { HeroSkinWithTokenId } from '~/HeroFeaturePage/shared/constants'
import { getHeroDataArray } from '~/HeroFeaturePage/shared/helpers'
import { heroFeatureState } from '~/HeroFeaturePage/shared/state'
import { FlexBox, Text } from '~/shared/components/Base'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

import { HERO_FEATURE_CAROUSEL_Z_INDEXES } from '../shared/constants'
import { SkinSpacing } from '../shared/types'
import { MintHeroSkinButton } from './components/MintHeroSkinButton'

interface HeroSkinControlsProps {
  id: number
  skinSpacing?: SkinSpacing
}

const DESCRIPTION_WIDTH = 216
const MOBILE_DESCRIPTION_WIDTH = 138
const CONTROLS_WIDTH = 182
const EXTRA_PAD_AMOUNT = 32
const MOBILE_EXTRA_PAD_AMOUNT = 24
const BUFFER_AMOUNT = 200
const MOBILE_BUFFER_AMOUNT = 100

export const HeroSkinControls = memo(({ id, skinSpacing }: HeroSkinControlsProps) => {
  const controls = useAnimationControls()
  const [heroSkin, setHeroSkin] = useState<HeroSkinWithTokenId | undefined>(undefined)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { isCarouselMoving } = useSnapshot(heroFeatureState)

  const [renderOverHero, setRenderOverHero] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    controls.stop()
    if (isCarouselMoving) {
      controls.set({ opacity: 0 })
    } else {
      controls.start({ opacity: 1, transition: { duration: 0.4, type: 'spring' } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCarouselMoving, id])

  const padAmount = useMemo(() => {
    if (!skinSpacing) return 12.5
    const screenWidth = skinSpacing.skinWidth + skinSpacing.endSkinPadAmount * 2

    const controlsWidth =
      skinSpacing.skinWidth +
      (!isTabletWide ? MOBILE_EXTRA_PAD_AMOUNT : EXTRA_PAD_AMOUNT) +
      CONTROLS_WIDTH +
      (!isTabletWide ? MOBILE_DESCRIPTION_WIDTH : DESCRIPTION_WIDTH) +
      (!isTabletWide ? MOBILE_BUFFER_AMOUNT : BUFFER_AMOUNT)

    if (controlsWidth >= screenWidth) {
      setRenderOverHero(true)
      return 12.5
    } else {
      setRenderOverHero(false)
      const totalPadAmount =
        skinSpacing.skinWidth +
        (!isTabletWide ? MOBILE_EXTRA_PAD_AMOUNT : EXTRA_PAD_AMOUNT)

      return totalPadAmount / 2
    }
  }, [skinSpacing, isTabletWide])

  useDebounce(
    () => {
      const heroData = getHeroDataArray(id)

      setHeroSkin(heroData.find((skin) => skin.id === id))
    },
    100,
    [id]
  )

  if (!heroSkin) return null

  return (
    <HeroControlsWrapper className={clsx({ renderOverHero })}>
      <StyledHeroControls
        animate={controls}
        initial={{ opacity: 0 }}
        py={[32, 32, 32, 46]}
        alignItems="flex-start"
        justifyContent="center"
      >
        <FlexBox
          type="start-column"
          maxWidth={[
            MOBILE_DESCRIPTION_WIDTH,
            MOBILE_DESCRIPTION_WIDTH,
            MOBILE_DESCRIPTION_WIDTH,
            DESCRIPTION_WIDTH
          ]}
          mr={padAmount}
        >
          <FlexBox type="centered-start-row" mb={['6px', '6px', '6px', '12px']}>
            <ImageIcon
              height="14px"
              type={heroSkin.grade === 'gold' ? 'heroes-gold' : 'heroes-gold'}
            />
            <Text
              fontSize={[10, 10, 10, 12]}
              ml="4px"
              fontWeight={!isTabletWide ? 'extraBold' : 'medium'}
              color="warm6"
              lineHeight={['14px', '14px', '14px', '16px']}
            >
              {t('heroFeature.heroSkin')}
            </Text>
          </FlexBox>

          <Text
            color="white"
            fontFamily="condensed"
            fontSize={[22, 22, 22, 44]}
            lineHeight={['26px', '26px', '26px', '53px']}
            fontWeight="bold"
            mb={['6px', '6px', '6px', '8px']}
          >
            {heroSkin.name}
          </Text>
          {!!heroSkin.flavorText && (
            <Text
              color="white"
              fontFamily="condensed"
              fontWeight="medium"
              fontSize={[14, 14, 14, 20]}
              lineHeight={['17px', '17px', '17px', '24px']}
              textWrap
            >
              {`${heroSkin.flavorText}`}
            </Text>
          )}
        </FlexBox>
        <MintHeroSkinButton
          width={CONTROLS_WIDTH}
          heroSkin={heroSkin}
          padAmount={padAmount}
        />
      </StyledHeroControls>
    </HeroControlsWrapper>
  )
})

const HeroControlsWrapper = styled.div`
  width: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: ${HERO_FEATURE_CAROUSEL_Z_INDEXES.CONTROLS};
  pointer-events: none;
  padding-left: 32px;
  padding-right: 32px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  &.renderOverHero {
    background: linear-gradient(
      0.05deg,
      #0c061e 0.04%,
      rgba(12, 6, 30, 0.8) 73.99%,
      rgba(12, 6, 30, 0) 99.96%
    );
  }
`

const StyledHeroControls = styled(motion(FlexBox))`
  width: 100%;
  max-width: 1200px;
`

HeroSkinControls.displayName = 'HeroSkinControls'
