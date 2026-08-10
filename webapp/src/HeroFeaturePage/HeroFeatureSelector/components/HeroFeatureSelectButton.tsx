import { keyframes } from '@emotion/react'
import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { heroFeatureState } from '~/HeroFeaturePage/shared/state'
import { SoundClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface HeroFeatureSelectButtonProps {
  isActive: boolean
  artId: string
  id: number
}

export const HeroFeatureSelectButton = memo(
  ({ isActive, artId, id }: HeroFeatureSelectButtonProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const navigate = useNavigate()

    const onClick = useCallback(() => {
      if (!heroFeatureState.isCarouselMoving && !isActive) {
        navigate(makeHeroRoute(id))
      }
    }, [id, isActive, navigate])

    return (
      <FlexBox width="100%" height="100%" type="centered-row">
        <StyledHeroFeatureSelectButton
          position="relative"
          width="100%"
          height={isActive ? [32, 32, 32, 62] : [27.5, 27.5, 27.5, 54]}
          bg="purple9"
          border="1px solid"
          borderColor={isActive ? 'white' : 'purple7'}
          overflow="hidden"
          onClick={onClick}
          onMouseDown={() => SoundClient.playSound('CursorMainClick')}
          onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
        >
          <HeroFeatureSelectButtonOverlay className={clsx({ isActive })} />
          {!!getAssetUrl && (
            <img src={getAssetUrl(`webapp/heroes/thumbnails/${artId}.webp`)} />
          )}
        </StyledHeroFeatureSelectButton>
      </FlexBox>
    )
  }
)

const StyledHeroFeatureSelectButton = styled(Box)`
  transition: 0.125s ease-in-out;
  :hover {
    border-color: ${({ theme }) => theme.colors.white};
  }
  img {
    position: absolute;
    z-index: 1;
    width: 100%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
`

const slide = keyframes`
	0% {transform:translateX(-100%);}
	100% {transform:translateX(100%);}
`

const HeroFeatureSelectButtonOverlay = styled.div`
  position: absolute;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  z-index: 2;
  transition: 0.125s ease-in-out;
  background: rgba(75, 28, 209, 0);
  &.isActive {
    background: rgba(75, 28, 209, 0.4);
    :after {
      content: '';
      top: 0;
      transform: translateX(100%);
      width: 100%;
      height: 240px;
      position: absolute;
      z-index: 2;
      animation: ${slide} 0.7s;
      background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.8) 50%,
        rgba(128, 186, 232, 0) 99%,
        rgba(125, 185, 232, 0) 100%
      );
    }
  }
`

HeroFeatureSelectButton.displayName = 'HeroFeatureSelectButton'
