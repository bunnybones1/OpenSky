import clsx from 'clsx'
import { throttle } from 'lodash-es'
import { memo, useEffect } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SHOP_NAV_BUTTON_CLASSNAME, SHOP_SECTION_CLASSNAME } from './shared/constants'
import { useShopTopOffset } from './shared/hooks/useShopTopOffset'
import { useShopSections } from './shared/queries/useShopSections'
import { ShopPageStyle } from './ShopPage.css'
import { ShopPageNav } from './ShopPageNav/ShopPageNav'
import { ShopSection } from './ShopSection/ShopSection'

export const ShopPage = memo(() => {
  const { data: shopSections } = useShopSections()

  const topOffset = useShopTopOffset()

  useEffect(() => {
    const handleScroll = () => {
      const isAtBottom =
        Math.abs(
          document.documentElement.scrollHeight -
            document.documentElement.scrollTop -
            document.documentElement.clientHeight
        ) < 1

      let current: string | null = null

      const sections = document.querySelectorAll<HTMLElement>(
        `section.${SHOP_SECTION_CLASSNAME}`
      )
      const navButtons = document.querySelectorAll(`.${SHOP_NAV_BUTTON_CLASSNAME}`)

      if (isAtBottom) {
        navButtons.forEach((button, i) => {
          button.classList.remove('isActive')
          if (i === navButtons.length - 1) {
            button.classList.add('isActive')
          }
        })
      } else {
        sections.forEach((section) => {
          const sectionTop = section.offsetTop
          if (scrollY >= sectionTop - topOffset) {
            current = section.getAttribute('id')
          }
        })

        if (!!current) {
          navButtons.forEach((button) => {
            if (button.classList.contains(`shop-nav-${current}`)) {
              if (!button.classList.contains('isActive')) {
                button.classList.add('isActive')
              }
            } else if (button.classList.contains('isActive')) {
              button.classList.remove('isActive')
            }
          })
        }
      }
    }

    const throttledScroll = throttle(handleScroll, 200)

    window.addEventListener('scroll', throttledScroll)

    return () => {
      window.removeEventListener('scroll', throttledScroll)
    }
  }, [topOffset])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        height: 'auto',
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: 'purple1'
      })}
    >
      <ShopPageNav />
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column'
          }),
          ShopPageStyle
        )}
      >
        {shopSections?.map(({ id }) => <ShopSection id={id} key={id} />)}
        <ShopSection />
      </div>
    </div>
  )
})

ShopPage.displayName = 'ShopPage'
