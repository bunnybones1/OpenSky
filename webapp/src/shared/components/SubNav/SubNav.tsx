import clsx from 'clsx'
import { memo, ReactElement } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SubNavButton, SubNavButtonProps } from './exported/SubNavButton'
import { SubNavDivider } from './shared/components/SubNavDivider'
import { SubNavContainer } from './SubNav.css'

export const SubNavSprinkles = Sprinkles({
  width: 'full',
  borderBottom: '1px solid',
  borderColor: 'purple7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
  backgroundColor: 'purple1',
  position: 'relative'
})

interface SubNavProps {
  children: ReactElement<SubNavButtonProps, typeof SubNavButton>[]
}

export const SubNav = memo(({ children }: SubNavProps) => {
  return (
    <div className={clsx(SubNavSprinkles, SubNavContainer)}>
      <SubNavDivider />
      {children}
    </div>
  )
})

SubNav.displayName = 'SubNav'
