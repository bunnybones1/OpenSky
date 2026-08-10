import { isTrait as _isTrait } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ImageIconTypes } from '../../ImageIcon/ImageIconConfig'
import { Text } from '../../Text'
import {
  CardInfoBoxDescStyle,
  CardInfoBoxOuterStyle,
  CardInfoBoxSprinkles,
  DescriptionStrong,
  InfoBoxBaseStyle,
  themeClass,
  TraitTitleStyle
} from './CardInfoBox.css'

export interface CardInfoBoxProps {
  icon?: ImageIconTypes
  description: string
  name: string | 'Locked'
}

const CardEffectTypeStrings = [
  'death',
  'glory',
  'inspire',
  'play',
  'summon',
  'sunrise',
  'sunset',
  'slay'
] as const

const DescriptionFontSize = {
  base: '12px',
  mobile: '14px',
  tabletWide: '16px'
} as const

const isVocabTitleCardEffect = (title: string) => {
  return CardEffectTypeStrings.some((typeString) => title.startsWith(typeString))
}

export const CardInfoBox = memo(({ description, name, icon }: CardInfoBoxProps) => {
  const { t } = useTranslation()

  const { hasTitle, colorIdentifier, isTrait } = useMemo(() => {
    const lowered = name.toLowerCase()
    const isTrait = name !== 'Locked' && _isTrait(lowered)
    const isTrigger = name !== 'Locked' && isVocabTitleCardEffect(lowered)
    return {
      hasTitle: isTrait || isTrigger || lowered === 'Locked',
      colorIdentifier: isTrait ? lowered : 'generic',
      isTrait
    } as const
  }, [name])

  return (
    <div
      className={clsx(
        CardInfoBoxOuterStyle,
        themeClass,
        Sprinkles({ backgroundColor: 'purple1' })
      )}
    >
      <div
        className={clsx(
          InfoBoxBaseStyle,
          CardInfoBoxSprinkles({
            background: colorIdentifier,
            borderColor: colorIdentifier
          })
        )}
      >
        <div
          className={Sprinkles({
            width: 'full',
            backgroundColor: 'purple1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative'
          })}
        >
          {hasTitle && (
            <div
              className={Sprinkles({
                width: 'full',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                position: 'absolute',
                right: 0,
                top: 0
              })}
            >
              <div
                className={clsx(
                  Sprinkles({
                    paddingRight: '4px',
                    paddingY: '4px',
                    paddingLeft: '4px'
                  }),
                  TraitTitleStyle,
                  CardInfoBoxSprinkles({
                    backgroundColor: colorIdentifier,
                    color: colorIdentifier
                  })
                )}
              >
                <Text fontSize="14px" fontWeight="700" color="purple1">
                  {name === 'Locked'
                    ? t('generic.LOCKED')
                    : isTrait
                    ? t('cards.TRAIT')
                    : t('cards.EFFECT')}
                </Text>
              </div>
            </div>
          )}
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'nowrap',
                justifyContent: 'flex-start',
                paddingY: '12px',
                paddingLeft: '8px'
              }),
              CardInfoBoxDescStyle,
              { needsExtraPadding: !!hasTitle && !icon && name !== 'Locked' }
            )}
          >
            <div className={Sprinkles({ flexGrow: 1 })}>
              <Text fontSize={DescriptionFontSize} color="purple9">
                <>
                  <strong className={DescriptionStrong}>{name}</strong>
                  {`: ${description}`}
                </>
              </Text>
            </div>
            {!!icon && (
              <div
                className={Sprinkles({
                  paddingTop: '24px',
                  paddingLeft: '24px',
                  paddingBottom: '8px'
                })}
              >
                <ImageIcon type={icon} height="24px" />
              </div>
            )}
            {name === 'Locked' && (
              <div
                className={Sprinkles({
                  paddingTop: '20px',
                  paddingLeft: '24px',
                  paddingBottom: '8px'
                })}
              >
                <Icon type="lock-diamond" height="32px" color="purple9" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

CardInfoBox.displayName = 'CardInfoBox'
