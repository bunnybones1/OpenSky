import { memo, useState } from 'react'

import { FlexBox } from '~/shared/components/Base'

import { Carousel } from './Carousel/Carousel'
import { Background } from './components/Background'
import { HeroSkinControls } from './HeroSkinControls/HeroSkinControls'
import { SkinSpacing } from './shared/types'

interface HeroFeatureCarouselProps {
  id: number
}

export const HeroFeatureCarousel = memo(({ id }: HeroFeatureCarouselProps) => {
  const [skinSpacing, setSkinSpacingForControls] = useState<SkinSpacing | undefined>(
    undefined
  )

  return (
    <FlexBox width="100%" position="relative" flex={1}>
      <Background id={id} />
      <Carousel id={id} setSkinSpacing={setSkinSpacingForControls} />
      <HeroSkinControls id={id} skinSpacing={skinSpacing} />
    </FlexBox>
  )
})

HeroFeatureCarousel.displayName = 'HeroFeatureCarousel'
