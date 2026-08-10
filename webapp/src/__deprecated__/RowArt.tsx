import styled from '@emotion/styled'
import { memo, useState } from 'react'
import { useMount, useMountedState } from 'react-use'

import { FadeIn } from '~/__deprecated__/style/animations'
import { Box } from '~/shared/components/Base/Box'

interface Props {
  art: string
  isSquare?: boolean
  className?: string
  useHeight?: boolean
}
/**
 * @deprecated Use ~/shared/components/RowArt
 */
export const RowArt = memo(
  ({ isSquare, art, className, useHeight, ...props }: Props) => {
    const [isReady, changeIsReady] = useState<boolean>(false)

    const isMounted = useMountedState()

    useMount(() => {
      if (!isReady) {
        const buffer = new Image()
        buffer.onload = () => {
          if (!isMounted()) return
          changeIsReady(true)
        }
        buffer.src = art
      }
    })

    if (isSquare) {
      return (
        <Box
          width="100%"
          height="100%"
          position="relative"
          className={className}
          style={{ transition: 'opacity 0.2s' }}
        >
          <SquareRowArtWrapper
            height="100%"
            width="41%"
            position="absolute"
            right={0}
            top={0}
            className="squareRowArtWrapper"
            bg="#231445"
          >
            <Box
              height="100%"
              width="100%"
              position="absolute"
              left={0}
              top={0}
              overflow="hidden"
            >
              {isReady && <FadeInImage src={art} className="squareArt" />}
            </Box>
            <Box
              position="absolute"
              top={0}
              left="-1px"
              width="calc(100% + 2px)"
              height="100%"
              zIndex={3}
              style={{
                backgroundImage:
                  'linear-gradient(to left, #231445 10%, rgba(35, 20, 69, 0) 70%)'
              }}
            />
            <Box
              zIndex={2}
              position="absolute"
              top={0}
              left="-1px"
              width="calc(100% + 2px)"
              height="100%"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #231445 10%, rgba(35, 20, 69, 0) 70%)'
              }}
            />
          </SquareRowArtWrapper>
        </Box>
      )
    }

    return (
      <StyledRowArt
        style={
          useHeight
            ? { height: '100%', left: '0px', top: '0px' }
            : { width: '100%', left: '0px', top: '0px' }
        }
        className="battleTagArtWrapper"
        {...props}
      >
        <Box
          className="dimmable"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '100%',
            width: '100%',
            /* eslint-disable max-len */
            background:
              'linear-gradient(90deg, rgba(35, 20, 69, 1) 0%, rgba(35, 20, 69, 0.85) 21%, rgba(35, 20, 69, 0.58) 40%, rgba(35, 20, 69, 0.15) 55%, rgba(35, 20, 69, 0.15) 78%, rgba(35, 20, 69, 0.79) 94%, rgba(35, 20, 69, 1) 100%)',
            /* eslint-enable max-len */
            zIndex: 3
          }}
        />
        {isReady && (
          <FadeInImage
            src={art}
            style={{
              height: useHeight ? '100%' : 'auto',
              width: useHeight ? 'auto' : '100%'
            }}
          />
        )}
      </StyledRowArt>
    )
  }
)

const FadeInImage = styled.img`
  animation: ${FadeIn} 0.2s ease-in-out;
  overflow: hidden;
  object-fit: cover;
`

const StyledRowArt = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  position: relative;
  left: -56px;
  width: 55%;
`

const SquareRowArtWrapper = styled(Box)`
  img {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    min-width: 100%;
    transform: translateX(-41.36%);
    &.squareBgArt {
      z-index: 1;
    }
    &.squareArt {
      z-index: 2;
    }
  }
`

RowArt.displayName = 'RowArt'
