import styled from '@emotion/styled'
import clsx from 'clsx'
import { CSSProperties, memo, ReactNode, useMemo } from 'react'
import { v4 } from 'uuid'

import { FlexBox } from '~/shared/components/Base'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

const CornerGraphic = memo(() => {
  const uniqueId = useMemo(() => {
    return v4()
  }, [])
  return (
    <svg
      height="100%"
      viewBox="0 0 108 109"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.5"
        d="M0.999996 62.581L0.999995 54L0.999991 1L62 0.999998M0.999996 62.581L1 107L13 94.8857L13 13.1143L94 13.1143L106 0.999994L62 0.999998M0.999996 62.581L62 0.999998"
        stroke={`url(#gradient-${uniqueId})`}
      />
      <defs>
        <radialGradient
          id={`gradient-${uniqueId}`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(44 45.4191) rotate(66.9974) scale(65.2553 207.58)"
        >
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
})

CornerGraphic.displayName = 'Corner'

interface GraphicBoxProps {
  onHover?: () => void
  bgImage?: string
  showTopLeftGraphic?: boolean
  showTopRightGraphic?: boolean
  showBottomLeftGraphic?: boolean
  showBottomRightGraphic?: boolean
  cornerHeight?: string
  children?: ReactNode
  dataId: string
}

export const GraphicBox = memo(
  ({
    onHover,
    showTopLeftGraphic,
    showTopRightGraphic,
    showBottomLeftGraphic,
    showBottomRightGraphic,
    bgImage,
    children,
    cornerHeight,
    dataId
  }: GraphicBoxProps) => {
    const wrapperStyle = useMemo<CSSProperties | undefined>(() => {
      if (bgImage) {
        return {
          backgroundImage: `url(${bgImage})`
        }
      }
      return
    }, [bgImage])
    const isTabletWide = useResponsiveQuery('tabletWide')

    return (
      <GraphicBoxWrapper
        onMouseEnter={onHover}
        width="100%"
        height="100%"
        position="relative"
        bg="purple3"
        style={wrapperStyle}
        className={clsx({ isNotDesktop: !isTabletWide })}
        data-id={dataId}
      >
        <FlexBox
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          style={{ pointerEvents: 'none' }}
          zIndex={2}
        >
          {showTopLeftGraphic && (
            <FlexBox
              position="absolute"
              top="-1px"
              left="-1px"
              height={cornerHeight || '20%'}
            >
              <CornerGraphic />
            </FlexBox>
          )}
          {showTopRightGraphic && (
            <FlexBox
              position="absolute"
              top="-1px"
              right="-1px"
              height={cornerHeight || '20%'}
              style={{ transform: 'rotate(90deg)' }}
            >
              <CornerGraphic />
            </FlexBox>
          )}
          {showBottomRightGraphic && (
            <FlexBox
              position="absolute"
              bottom="-1px"
              right="-1px"
              height={cornerHeight || '20%'}
              style={{ transform: 'rotate(180deg)' }}
            >
              <CornerGraphic />
            </FlexBox>
          )}
          {showBottomLeftGraphic && (
            <FlexBox
              position="absolute"
              bottom="-1px"
              left="-1px"
              height={cornerHeight || '20%'}
              style={{ transform: 'rotate(-90deg)' }}
            >
              <CornerGraphic />
            </FlexBox>
          )}
        </FlexBox>
        {children}
      </GraphicBoxWrapper>
    )
  }
)

const GraphicBoxWrapper = styled(FlexBox)`
  border-width: 2px;
  border-style: solid;
  background-size: cover;
  border-color: ${(props) => props.theme.colors.purple7};
  transition: 0.125s ease-in-out;
  background-position: center;
  color: ${(props) => props.theme.colors.purple7};

  &:hover {
    color: ${(props) => props.theme.colors.purple9};
    border-color: ${(props) => props.theme.colors.purple9};
    filter: drop-shadow(0px 0px 10px ${(props) => props.theme.colors.purple10});
  }
`

GraphicBox.displayName = 'GraphicBox'
