import { isIOSNativeApp } from '@opensky/shared/check-mobile-app-type'
import { memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMount, useUnmount } from 'react-use'
import { useSnapshot } from 'valtio'

import { FlexBox } from '~/shared/components/Base'
import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { updateSelectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { HeightOneHundredVhMinusOffset } from '~/shared/style/TopOffsetStyle.css'

import { HeroFeatureCarousel } from './HeroFeatureCarousel/HeroFeatureCarousel'
import { HeroFeatureSelector } from './HeroFeatureSelector/HeroFeatureSelector'
import { ReviewMintOrderButton } from './ReviewMintOrderButton/ReviewMintOrderButton'
import { BASE_SKIN_ARRAY, HERO_SKIN_ARRAY } from './shared/constants'
import { heroFeatureState, updateHeroFeatureState } from './shared/state'

const HeroFeature = memo(() => {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)

  const { fromPage } = useSnapshot(heroFeatureState)

  const navigate = useNavigate()

  useMount(() => {
    updateSelectGoldsState('previousFeatureId', undefined)

    const params = new URLSearchParams(window.location.search)

    const fromParam = params.get('from')

    if (!!fromParam) {
      updateHeroFeatureState('fromPage', fromPage)
    }
  })

  useUnmount(() => {
    updateHeroFeatureState('fromPage', undefined)
  })

  // Check if the ID in the url actually corresponds to a hero.
  const isValidHeroId = useMemo(() => {
    const numberId = Number(id)

    if (isNaN(numberId)) return false

    const heroData = numberId < 0 ? BASE_SKIN_ARRAY : HERO_SKIN_ARRAY

    return heroData.some((hero) => hero.id === numberId)
  }, [id])

  const onBackClick = useCallback(() => {
    if (heroFeatureState.fromPage) {
      navigate(heroFeatureState.fromPage)
    } else {
      if (isIOSNativeApp()) {
        navigate(ROUTES_CONFIG.routes.HOME.directPath)
      } else {
        navigate(makeMarketHeroSkinsRoute())
      }
    }
  }, [navigate])

  if (!isValidHeroId) {
    return null
  }

  return (
    <FlexBox
      width="100%"
      className={HeightOneHundredVhMinusOffset}
      overflow="hidden"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      position="relative"
    >
      <FlexBox
        position="absolute"
        left="env(safe-area-inset-left, 0px)"
        top={0}
        zIndex={99}
        width={['74px', '74px', '74px', '102px']}
      >
        <FancyBackButton onClick={onBackClick} />
      </FlexBox>
      <HeroFeatureCarousel id={id} />
      <HeroFeatureSelector id={id} />
      <ReviewMintOrderButton />
    </FlexBox>
  )
})

HeroFeature.displayName = 'HeroFeature'

export default HeroFeature
