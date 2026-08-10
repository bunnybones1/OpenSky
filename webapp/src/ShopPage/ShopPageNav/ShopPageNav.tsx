import clsx from 'clsx'
import { memo } from 'react'

import { SubNavDivider } from '~/shared/components/SubNav/shared/components/SubNavDivider'
import { SubNavSprinkles } from '~/shared/components/SubNav/SubNav'
import { SubNavContainer } from '~/shared/components/SubNav/SubNav.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useShopSections } from '../shared/queries/useShopSections'
import { ShopPageNavButton } from './components/ShopPageNavButton'
import { ShopPageNavStyle } from './ShopPageNav.css'

export const ShopPageNav = memo(() => {
  const { data: shopSections } = useShopSections()

  if (!shopSections || !shopSections.length) return null

  return (
    <div
      className={clsx(
        ShopPageNavStyle,
        SubNavSprinkles,
        SubNavContainer,
        Sprinkles({ position: 'sticky' })
      )}
    >
      <SubNavDivider />
      {shopSections.map((section) => (
        <ShopPageNavButton id={section.id} text={section.id} key={section.id} />
      ))}
    </div>
  )
})

ShopPageNav.displayName = 'ShopPageNav'
