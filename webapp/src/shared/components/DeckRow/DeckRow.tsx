import { DeckClass } from '@opensky/proto'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { useMediaQuery } from '~/shared/hooks/ui/useMediaQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { AngledBox } from '../AngledBox/AngledBox'
import { RowArt } from '../RowArt/RowArt'
import { DeckRowInfo } from './components/DeckRowInfo'
import { DeckRowMiniDeck } from './components/DeckRowMiniDeck'
import { GradeBar } from './components/GradeBar'
import {
  DeckRowDropdownArea,
  DeckRowLock,
  DeckRowPrism,
  DeckRowSmallIcon,
  DeckRowStyle,
  DeckRowWrapperStyle
} from './DeckRow.css'

interface DeckRowProps {
  isLarge?: boolean
  isLocked?: boolean
  isSelected?: boolean
  numGoldCards?: number
  showPrism?: boolean
  isPresentational?: boolean
  numSilverCards?: number
  hasDropdown?: boolean
  deckString: string
  deckArt: string
  rowArt: string
  identifier: string | number
  onClick?: (identifier: string | number) => void
  onHover?: () => void
  deckClass: DeckClass
  numCardsInDeck?: number
  numCardsRequiredInDeck: number
  name: string
  isFavourite?: boolean
  isStarterDeck?: boolean
}

export const DeckRow = memo(
  ({
    isLarge,
    isSelected,
    deckArt,
    numGoldCards,
    numSilverCards,
    deckClass,
    rowArt,
    numCardsInDeck,
    numCardsRequiredInDeck,
    name,
    showPrism,
    deckString,
    onClick,
    identifier,
    isLocked,
    hasDropdown,
    isPresentational,
    onHover,
    isFavourite,
    isStarterDeck
  }: DeckRowProps) => {
    const isInvalidDeck =
      numCardsInDeck !== undefined && numCardsInDeck !== numCardsRequiredInDeck
    const { getAssetUrl } = useGetAssetContext()
    const [isHovered, setIsHovered] = useState(false)
    const isTouchDevice = useMediaQuery('(any-hover: none)')

    const setHovered = useCallback(() => setIsHovered(true), [])
    const setUnHovered = useCallback(() => setIsHovered(false), [])

    const _onClick = useCallback(() => {
      if (onClick) {
        onClick(identifier)
      }
    }, [onClick, identifier])

    return (
      <div
        onMouseDown={() => {
          if (!isLocked) SoundClient.playSound('OpenDialog')
        }}
        onMouseEnter={() => {
          if (!isLocked) SoundClient.playSound('CursorMainHover')
          if (onHover) onHover()
        }}
        data-starter-hero={isStarterDeck ? DECKCLASS_HEROES[deckClass] : undefined}
        data-deckstring={deckString}
        className={clsx(DeckRowWrapperStyle, { isLarge })}
      >
        <div
          onMouseEnter={!isTouchDevice && !isPresentational ? setHovered : undefined}
          onMouseOver={!isTouchDevice && !isPresentational ? setHovered : undefined}
          onMouseLeave={
            !isTouchDevice && !isPresentational ? setUnHovered : undefined
          }
          className={clsx(
            Sprinkles({
              pointerEvents: isLocked ? 'none' : undefined,
              position: 'relative',
              height: 'full',
              width: 'full',
              cursor: isPresentational ? undefined : 'pointer'
            }),
            DeckRowStyle,
            { isLarge, isLocked }
          )}
          onClick={_onClick}
        >
          <AngledBox
            cornerSize={isLarge ? '12px' : '8px'}
            borderColor={isHovered || isSelected ? 'purple9' : 'purple7'}
            backgroundColor="purple1"
            borderSize="1px"
          >
            <div
              className={Sprinkles({
                height: 'full',
                width: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                position: 'relative'
              })}
            >
              <RowArt url={rowArt} useHeight />
              <DeckRowInfo
                deckClass={deckClass}
                numCardsInDeck={numCardsInDeck}
                numCardsRequiredInDeck={numCardsRequiredInDeck}
                isLarge={!!isLarge}
                name={name}
                hasGradeMeter={
                  !isInvalidDeck &&
                  (numGoldCards !== undefined || numSilverCards !== undefined)
                }
                deckString={deckString}
              />
              {!!hasDropdown && (
                <div
                  className={clsx(
                    Sprinkles({
                      position: 'absolute',
                      height: 'full',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'purple2'
                    }),
                    DeckRowDropdownArea,
                    { isLarge }
                  )}
                >
                  <Icon type="caret-down" color="white" height="12px" />
                </div>
              )}
              {(numGoldCards !== undefined || numSilverCards !== undefined) &&
                !isInvalidDeck && (
                  <GradeBar
                    numSilverCards={numSilverCards || 0}
                    numGoldCards={numGoldCards || 0}
                    numCardsRequiredInDeck={numCardsRequiredInDeck}
                    isLarge={!!isLarge}
                  />
                )}
            </div>
            {!!showPrism && !!getAssetUrl && (
              <div
                className={clsx(Sprinkles({ position: 'absolute' }), DeckRowPrism, {
                  isLarge,
                  hasDropdown
                })}
              >
                <img
                  className={Sprinkles({ width: 'full', height: 'full' })}
                  src={getAssetUrl(`webapp/icons/prisms/small/${deckClass}.webp`)}
                />
              </div>
            )}
          </AngledBox>
          <DeckRowMiniDeck
            isLarge={!!isLarge}
            numGoldCards={numGoldCards || 0}
            numSilverCards={numSilverCards || 0}
            deckArt={deckArt}
            isHighlighted={isHovered || !!isSelected}
            deckClass={deckClass}
          />
          {!!isInvalidDeck && !isFavourite && (
            <div
              className={clsx(Sprinkles({ position: 'absolute' }), DeckRowSmallIcon)}
            >
              <Icon
                type="alert-stroke"
                height={isLarge ? '32px' : '24px'}
                color="warm5"
              />
            </div>
          )}
          {!!isFavourite && (
            <div
              className={clsx(Sprinkles({ position: 'absolute' }), DeckRowSmallIcon)}
            >
              <Icon
                type="star-stroke"
                height={isLarge ? '32px' : '24px'}
                color="warm6"
              />
            </div>
          )}
        </div>
        {!!isLocked && (
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }),
              DeckRowLock
            )}
          >
            <Icon
              type="lock-diamond"
              color="purple9"
              height={isLarge ? '48px' : '32px'}
            />
          </div>
        )}
      </div>
    )
  }
)

DeckRow.displayName = 'DeckRow'
