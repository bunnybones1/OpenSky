import * as React from 'react'

import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  onClear: () => void
  hasValue: boolean
  isSmallScreen?: boolean
}

const ClearIcon = ({ onClear, hasValue, isSmallScreen, ...props }: Props) => {
  if (!hasValue) return null
  if (isSmallScreen) return null
  return (
    <FlexBox px={2} height={24} type="centered-row" {...props}>
      <Icon color="purple9" type="close-circled" height="14px" onClick={onClear} />
    </FlexBox>
  )
}

export default ClearIcon
