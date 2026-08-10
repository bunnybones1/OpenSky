import { HTMLAttributes, memo } from 'react'

import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'

interface CheckBoxProps extends HTMLAttributes<HTMLDivElement> {
  onClick: () => void
  checked: boolean
}
/**
 * @deprecated Use ~/shared/components/CheckBox
 */
const CheckBox = memo(({ onClick, checked, ...props }: CheckBoxProps) => (
  <FlexBox
    type="centered-row"
    border="1px solid"
    borderRadius="2px"
    borderColor={checked ? 'cold7' : 'purple7'}
    bg={checked ? 'cold3' : null}
    onClick={onClick}
    height={24}
    width={24}
    style={{
      userSelect: 'none'
    }}
    {...props}
  >
    {checked && <Icon type="check" color="white" height="12px" />}
  </FlexBox>
))

CheckBox.displayName = 'CheckBox'

export default CheckBox
