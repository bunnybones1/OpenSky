import { memo } from 'react'

import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { NAVBAR_HEIGHT, NAVBAR_WIDTH } from '~/shared/constants/ui'

const IconHeight = { base: '32px', tabletWide: '48px' } as const

export const RouteLoaderComponent = memo(() => {
  return (
    <FlexBox
      position="fixed"
      bottom={0}
      right={0}
      left={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      top={[0, 0, 0, NAVBAR_HEIGHT]}
      zIndex={30}
      type="centered-row"
    >
      <Icon type="spinner" height={IconHeight} color="white" />
    </FlexBox>
  )
})

RouteLoaderComponent.displayName = 'RouteLoaderComponent'
