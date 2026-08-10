import styled from '@emotion/styled'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base/Box'

interface NewBadgeProps {
  className?: string
  visible?: boolean
}

function NewBadge({ className, visible = true }: NewBadgeProps) {
  const { t } = useTranslation()
  return (
    <BadgeContainer visible={visible} className={className}>
      <Badge>{t('generic.new')}</Badge>
    </BadgeContainer>
  )
}

const BadgeContainer = styled(Box)<{ visible: boolean }>`
  display: flex;
  width: 46px;
  height: 46px;
  border-radius: 23px;
  background: red;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.purple1};
  pointer-events: ${({ visible }) => (visible ? 'initial' : 'none')};
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  will-change: opacity;
  transition: opacity ${({ theme }) => theme.transition};
`

const Badge = styled(Box)`
  display: flex;
  width: 35px;
  height: 35px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.black};
  background: ${({ theme }) => theme.colors.warm6};
  box-shadow: ${({ theme }) => `0px 0px 8px 2px ${theme.colors.warm6}80`};
  font-size: 13px;
  font-weight: 600;
  text-align: center;
`

NewBadge.displayName = 'NewBadge'

export default NewBadge
