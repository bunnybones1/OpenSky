import { DeckClass } from '@opensky/proto'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { BaseCard } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { ComponentType, memo, MouseEvent, ReactNode, useCallback } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { ItemLock } from '~/shared/components/ItemLock'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { DeckCardGradeType } from '~/shared/types/decks'

import { Button } from '../Button'
import { CostGraph } from '../CostGraph/CostGraph'
import { Text } from '../Text'
import { DeckCardsCount } from './components/DeckCardsCount'
import { DeckFavouriteButton } from './components/DeckFavouriteButton'
import { DeckImages } from './components/DeckImages'
import { DeckInfo } from './components/DeckInfo'
import {
  DeckCostGraph,
  DeckSettingsButton,
  DeckStyle,
  DeckWrapperStyle,
  InvalidDeckIcon,
  LockWrapper
} from './shared/Deck.css'

interface DeckProps {
  className?: Parameters<typeof clsx>[0]
  isLocked?: boolean
  isLockedText?: string
  isNew?: boolean
  isStarterDeck?: boolean
  gradeType?: DeckCardGradeType
  artCardId?: BaseCard
  onFavouriteChange?: (favourited: boolean) => void
  isFavourited?: boolean
  isSelected?: boolean
  onSettingsClick?: (identifier: string) => void
  deckClass: DeckClass
  deckString: string
  DeckStats?: ReactNode
  numCardsInDeck?: number
  numCardsRequiredInDeck: number
  name: string
  onClick: (identifier: string) => void
  onHover?: () => void
  identifier: string
  rankInfoNumber?: number
  rankInfoIcon?: IconTypes
  NewBadge?: ComponentType<{ identifier: string }>
}

export const Deck = memo(
  ({
    className,
    isLocked,
    onClick,
    identifier,
    isNew,
    numCardsInDeck,
    numCardsRequiredInDeck,
    isLockedText,
    isStarterDeck,
    deckClass,
    artCardId,
    gradeType,
    isFavourited,
    isSelected,
    onFavouriteChange,
    onSettingsClick,
    name,
    deckString,
    DeckStats,
    rankInfoNumber,
    rankInfoIcon,
    NewBadge,
    onHover
  }: DeckProps) => {
    const isInvalidDeck =
      numCardsInDeck !== undefined && numCardsInDeck !== numCardsRequiredInDeck

    const _onSettingsClick = useCallback(
      (event: MouseEvent) => {
        event.stopPropagation()
        if (onSettingsClick) onSettingsClick(identifier)
      },
      [identifier, onSettingsClick]
    )

    const _onClick = useCallback(() => {
      onClick(identifier)
    }, [onClick, identifier])

    return (
      <div
        className={clsx(
          Sprinkles({ width: 'full', position: 'relative' }),
          className,
          DeckWrapperStyle
        )}
        onMouseEnter={onHover}
        data-deckstring={deckString}
        data-starter-hero={isStarterDeck ? DECKCLASS_HEROES[deckClass] : undefined}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0
            }),
            { isLocked, isSelected },
            DeckStyle
          )}
          onClick={_onClick}
        >
          <DeckImages
            isStarterDeck={!!isStarterDeck}
            deckClass={deckClass}
            isHighlighted={!!isNew}
            artCardId={artCardId}
            gradeType={gradeType}
          />
          {!!onFavouriteChange && (
            <DeckFavouriteButton
              onFavouriteChange={onFavouriteChange}
              isFavourited={isFavourited}
            />
          )}
          <DeckInfo
            name={name}
            isStarterDeck={!!isStarterDeck}
            deckClass={deckClass}
            DeckStats={DeckStats}
            rankInfoIcon={rankInfoIcon}
            rankInfoNumber={rankInfoNumber}
          />
          <DeckCardsCount
            numCardsInDeck={numCardsInDeck}
            numCardsRequiredInDeck={numCardsRequiredInDeck}
          />
          {isInvalidDeck && (
            <div
              className={clsx(Sprinkles({ position: 'absolute' }), InvalidDeckIcon)}
            >
              <Icon type="alert-stroke" color="warm8" height="24px" />
            </div>
          )}
          {!!onSettingsClick && (
            <div
              className={clsx(
                Sprinkles({ position: 'absolute' }),
                DeckSettingsButton
              )}
            >
              <Button
                colorType="default"
                frameType="rightCorner"
                onClick={_onSettingsClick}
                leftAdornment={{ icon: 'gear' }}
              />
            </div>
          )}
          <div className={clsx(Sprinkles({ position: 'absolute' }), DeckCostGraph)}>
            <CostGraph deckString={deckString} />
          </div>
        </div>
        {!!isLocked && (
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                pointerEvents: 'all',
                height: 'full',
                width: 'full',
                top: 0,
                left: 0
              }),
              LockWrapper
            )}
          >
            <ItemLock />
            {!!isLockedText && (
              <Text fontSize="12px" color="purple9" marginTop="8px">
                {isLockedText}
              </Text>
            )}
          </div>
        )}
        {!!NewBadge && <NewBadge identifier={identifier} />}
      </div>
    )
  }
)

Deck.displayName = 'Deck'
