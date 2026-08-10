import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { createDeckState } from '../shared/state/create-deck-state'
import { CreateDeckButton } from './components/CreateDeckButton'
import { SelectedPrism } from './components/SelectedPrism'
import {
  PrismDescriptionDescription,
  PrismDescriptionInner,
  PrismDescriptionStyle,
  PrismDescriptionTextWrapper
} from './PrismDescription.css'

export const PrismDescription = memo(() => {
  const { t } = useTranslation()
  const { deckClass } = useSnapshot(createDeckState)

  return (
    <div
      className={clsx(
        Sprinkles({
          flex: 1,
          position: 'relative',
          zIndex: 3,
          height: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }),
        PrismDescriptionStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative'
          }),
          PrismDescriptionInner
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              flexDirection: 'column',
              paddingBottom: { base: '0px', mobile: '12px', tablet: '16px' }
            }),
            PrismDescriptionTextWrapper
          )}
        >
          <div
            className={Sprinkles({
              width: 'full',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              display: 'flex',
              flexWrap: 'nowrap'
            })}
          >
            <div
              className={Sprinkles({
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                flexWrap: 'nowrap',
                flexDirection: 'column'
              })}
            >
              {deckClass !== 'UNKNOWN_CLASS' && (
                <div
                  className={Sprinkles({
                    fontSize: { base: '14px', tabletWide: '18px' },
                    width: 'full',
                    color: 'purple9',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontFamily: 'condensed',
                    paddingBottom: { base: '0px', tablet: '8px' },
                    paddingTop: '4px'
                  })}
                >
                  {t(`createDeck.deckCodes.${deckClass}.prisms`)}
                </div>
              )}
              <div
                className={clsx(
                  Sprinkles({
                    color: 'purple9',
                    fontWeight: '600',
                    width: 'full',
                    textAlign: 'left',
                    fontFamily: 'condensed',
                    fontSize: {
                      base: '26px',
                      mobile: '36px',
                      tabletWide: '40px',
                      desktopWide: '50px'
                    }
                  })
                )}
              >
                {t(`createDeck.deckCodes.${deckClass}.name`).toUpperCase()}
              </div>
            </div>
            <SelectedPrism />
          </div>
          <div
            className={clsx(
              Sprinkles({
                fontSize: { base: '12px', mobile: '14px', tabletWide: '18px' },
                color: 'purple8',
                width: 'full',
                textAlign: 'left',
                paddingRight: { base: '20px', tablet: '0px' },
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid',
                borderColor: 'purple11'
              }),
              PrismDescriptionDescription
            )}
          >
            {t(`createDeck.deckCodes.${deckClass}.desc`)}
          </div>
        </div>
        <CreateDeckButton />
      </div>
    </div>
  )
})

PrismDescription.displayName = 'PrismDescription'
