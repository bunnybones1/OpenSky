import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeckClass } from '~/lib/proto'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import PrismBorder from './components/PrismBorder'
import {
  PrismButtonBackground,
  PrismButtonFlare,
  PrismButtonImage,
  PrismButtonImageWrapper,
  PrismButtonInner,
  PrismButtonLock,
  PrismButtonStyle
} from './PrismButton.css'

interface PrismButtonProps {
  deckClass: DeckClass
  isSelected: boolean
  onClick: (prism: DeckClass) => void
}

export const PrismButton = memo(
  ({ deckClass, isSelected, onClick }: PrismButtonProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { data: unlockedDeckClasses } = useUnlockedDeckClasses()

    const isUnlocked = useMemo(() => {
      return !!unlockedDeckClasses && unlockedDeckClasses.includes(deckClass)
    }, [unlockedDeckClasses, deckClass])

    const _onClick = useCallback(() => {
      onClick(deckClass)
    }, [deckClass, onClick])

    const { t } = useTranslation()

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            height: 'auto',
            position: 'relative',
            cursor: 'pointer'
          }),
          PrismButtonStyle,
          { isSelected, isLocked: !isUnlocked }
        )}
      >
        <div
          className={clsx(
            Sprinkles({ position: 'relative', width: 'full' }),
            PrismButtonInner
          )}
        >
          <div
            className={Sprinkles({
              position: 'absolute',
              left: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              top: 0,
              width: 'full',
              zIndex: 2
            })}
          >
            <div
              onClick={isUnlocked ? _onClick : undefined}
              className={PrismButtonImageWrapper}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl(`webapp/icons/prisms/large/${deckClass}.webp`)}
                  className={clsx(Sprinkles({ width: 'full' }), PrismButtonImage, {
                    isUnlocked
                  })}
                />
              )}
            </div>
            <PrismBorder isUnlocked={isUnlocked} isSelected={isSelected} />
          </div>
        </div>
        <Text
          color={isUnlocked ? 'white' : 'purple6'}
          fontSize={{ base: '12px', tablet: '16px', desktop: '18px' }}
          marginTop={{ base: '16px', tablet: '24px', desktop: '36px' }}
          fontWeight="700"
        >
          {t(
            `deckBuilder.prismFilter.${
              deckClass as 'HRT' | 'STR' | 'WIS' | 'AGY' | 'INT' | 'UNKNOWN_CLASS'
            }`
          )}
        </Text>
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              pointerEvents: 'none'
            }),
            PrismButtonFlare
          )}
        />
        {!isUnlocked && (
          <div
            className={clsx(
              Sprinkles({
                zIndex: 2,
                position: 'absolute'
              }),
              PrismButtonLock
            )}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/misc/card-lock.webp')}
                className={Sprinkles({ width: 'full' })}
              />
            )}
          </div>
        )}
        <div
          className={clsx(
            Sprinkles({
              opacity: isSelected ? 1 : 0,
              pointerEvents: 'none',
              position: 'absolute',
              width: 'full',
              zIndex: 3
            }),
            PrismButtonBackground
          )}
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl('webapp/backgrounds/selected-desktop.webp')})`
              : undefined
          }}
        />
      </div>
    )
  }
)

PrismButton.displayName = 'PrismButton'
