import styled from '@emotion/styled'
import { memo } from 'react'

import { Box } from '~/shared/components/Base/Box'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface ProgressCheckBoxProps {
  active?: boolean
  nextActiveIcon?: boolean
}

const ProgressCheckBoxIcon = memo(
  ({ active = false, nextActiveIcon = false }: ProgressCheckBoxProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const isTabletWide = useResponsiveQuery('tabletWide')
    let src = !getAssetUrl
      ? null
      : active
      ? getAssetUrl(`webapp/icons/wingedcheckboxactive.webp`)
      : getAssetUrl(`webapp/icons/wingedcheckbox.webp`)

    if (nextActiveIcon && !!getAssetUrl) {
      src = getAssetUrl(`webapp/icons/match-active.webp`)
    }

    if (!src) return null

    return (
      <ProgressCheckBoxContainer>
        <img
          src={src}
          style={{
            width: !isTabletWide ? '32px' : '48px'
          }}
        />
      </ProgressCheckBoxContainer>
    )
  }
)

ProgressCheckBoxIcon.displayName = 'ProgressCheckBoxIcon'

const ProgressCheckBoxContainer = styled(Box)``

export default ProgressCheckBoxIcon
