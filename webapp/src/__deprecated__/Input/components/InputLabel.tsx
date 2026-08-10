import * as React from 'react'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  isSmallScreen?: boolean
}

const InputLabel = ({ label, isSmallScreen, ...props }: Props) => {
  if (!label || isSmallScreen) {
    return null
  }

  return (
    <FlexBox
      height={24}
      type="centered-end-row"
      style={{ padding: '0px 8px' }}
      {...props}
    >
      <Text
        fontSize={18}
        color="purple9"
        fontFamily="condensed"
        pr={6}
        className="inputLabel"
      >
        {label}
      </Text>
    </FlexBox>
  )
}

export default InputLabel
