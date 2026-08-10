import { memo } from 'react'

import { ThemeColorType } from '~/__deprecated__/style/types'
import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'

interface Props {
  title?: string
  mobileLeft?: string
  left?: string
  textClass?: string
  color?: ThemeColorType
  leftDisabled?: boolean
  rightDisabled?: boolean
}

const TitleDetailLines = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    height="100%"
    viewBox="0 0 120 80"
  >
    <defs>
      <path id="left-title-detail-a" d="M0 1h158v80H0z" />
    </defs>
    <g fill="none" fillRule="evenodd" transform="translate(-1 -1)">
      <mask id="left-title-detail-b" fill="#fff">
        <use xlinkHref="#left-title-detail-a" />
      </mask>
      <path
        stroke="#735CB2"
        strokeLinejoin="bevel"
        d="M52.763 68.265L0 119.733M92.097 55.492L66.19 81 53 68.01 120.744 1M.214 42.385L26 16.992 9.973 1"
        mask="url(#left-title-detail-b)"
        opacity=".25"
      />
      <path
        stroke="#735CB2"
        strokeLinejoin="bevel"
        d="M69.035 1L53 16.992 157.393 121"
        mask="url(#left-title-detail-b)"
        opacity=".25"
      />
      <path
        stroke="#735CB2"
        strokeLinecap="round"
        strokeLinejoin="bevel"
        d="M39.5 81L0 42.5 39.5 4 79 42.5z"
        mask="url(#left-title-detail-b)"
        opacity=".25"
      />
    </g>
  </svg>
))

TitleDetailLines.displayName = 'TitleDetailLines'

export const TitleDetail = memo(
  ({
    title,
    mobileLeft = '50%',
    left,
    textClass,
    color = 'purple9',
    rightDisabled,
    leftDisabled
  }: Props) => (
    <Box width="100%" height="100%" position="relative" bg="inherit">
      {!leftDisabled && (
        <Box height="100%" position="absolute" left={0} top={0}>
          <TitleDetailLines />
        </Box>
      )}
      {!!title && (
        <FlexBox
          position="absolute"
          top={0}
          left={[mobileLeft, mobileLeft, left ?? '50%']}
          transform={left ? 'none' : 'translateX(-50%)'}
          height="100%"
          type="centered-row"
          className="titleDetailText"
        >
          <Text
            className={textClass}
            fontSize={[24, 24, 28, 38]}
            color={color}
            fontFamily="condensed"
            fontWeight="bold"
          >
            {title.toUpperCase()}
          </Text>
        </FlexBox>
      )}
      {!rightDisabled && (
        <Box
          height="100%"
          position="absolute"
          right={0}
          top={0}
          transform="scaleX(-1)"
        >
          <TitleDetailLines />
        </Box>
      )}
    </Box>
  )
)

TitleDetail.displayName = 'TitleDetail'
