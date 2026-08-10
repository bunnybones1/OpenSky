import clsx from 'clsx'
import { ComponentType, memo, ReactNode, useCallback, useState } from 'react'

import { Sprinkles, SprinklesParams } from '~/shared/style/Sprinkles.css'

import { Portal } from './Portal'
import {
  FilterPanel,
  FilterPanelUnderlay,
  FilterPanelWrapper,
  SearchBarBgVariants,
  SearchBarStyle
} from './SearchBar.css'

interface SearchBarProps {
  PanelFilters?: ComponentType
  // On some pages we dont render the navbar on the left side of
  // the screen on mobile. This boolean allows us to disable the
  // padding.
  hasNoFilterPanelLeftPadding?: boolean
  hasBannerMargin?: boolean
  background: keyof typeof SearchBarBgVariants
  children: (toggleFilterPanel: () => void) => ReactNode
  justifyContent?: SprinklesParams['justifyContent']
  className?: Parameters<typeof clsx>[0]
}

export const SearchBar = memo(
  ({
    background,
    justifyContent,
    children,
    PanelFilters,
    className,
    hasNoFilterPanelLeftPadding,
    hasBannerMargin
  }: SearchBarProps) => {
    const [isFilterPanelOpen, setisFilterPanelOpen] = useState(false)

    const toggleFilterPanel = useCallback(() => {
      setisFilterPanelOpen((isOpen) => !isOpen)
    }, [])

    return (
      <>
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'sticky',
              display: 'flex',
              paddingBottom: {
                base: '12px',
                mobile: '20px',
                tabletWide: '32px'
              },
              paddingX: {
                base: '12px',
                mobile: '20px',
                tabletWide: '32px'
              },
              paddingTop: {
                base: '12px',
                tabletWide: '24px'
              },
              justifyContent: justifyContent || 'flex-start'
            }),
            SearchBarStyle,
            SearchBarBgVariants[background],
            className
          )}
        >
          {children(toggleFilterPanel)}
        </div>
        {!!PanelFilters && (
          <Portal>
            <div
              className={clsx(Sprinkles({ position: 'fixed' }), FilterPanelWrapper, {
                hasNoFilterPanelLeftPadding,
                hasBannerMargin
              })}
            >
              <div
                className={clsx(
                  Sprinkles({
                    height: 'full',
                    backgroundColor: 'purple4',
                    borderColor: 'purple5',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    paddingLeft: '24px',
                    paddingTop: '12px'
                  }),
                  FilterPanel,
                  { isVisible: isFilterPanelOpen }
                )}
              >
                <PanelFilters />
              </div>
              <div
                onClick={toggleFilterPanel}
                className={clsx(
                  Sprinkles({ width: 'full', height: 'full' }),
                  FilterPanelUnderlay,
                  { isVisible: isFilterPanelOpen }
                )}
              />
            </div>
          </Portal>
        )}
      </>
    )
  }
)

SearchBar.displayName = 'SearchBar'
