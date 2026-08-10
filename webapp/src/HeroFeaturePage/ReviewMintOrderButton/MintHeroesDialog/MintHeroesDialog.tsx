import clsx from 'clsx'
import { memo, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { derivedHeroFeatureState } from '~/HeroFeaturePage/shared/state'
import { TableHeader } from '~/shared/components/CartModal'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { MINT_HEROES_DIALOG_ID } from '~/shared/constants/ui'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MintHeroesModalHeader } from './components/MintHeroesModalHeader'
import { MintHeroesModalTotal } from './components/MintHeroesModalTotal'
import { HeroesToMintList } from './HeroesToMintList/HeroesToMintList'
import {
  MintHeroesControlsStyle,
  MintHeroesDialogStyle,
  MintHeroesHeaderStyle,
  MintHeroesSkinsStyle
} from './MintHeroesDialog.css'
import { MintHeroesModalControls } from './MintHeroesModalControls/MintHeroesModalControls'

const { closeDialog } = controlDialog(MINT_HEROES_DIALOG_ID)

export const MintHeroesDialog = memo(() => {
  const { totalSkinsInOrder } = useSnapshot(derivedHeroFeatureState)
  const { t } = useTranslation()

  const tableHeaders = useMemo<TableHeader[]>(
    () => [
      {
        text: t('heroFeature.heroSkinHeader'),
        secondaryText: t('heroFeature.heroSkinSubHeader'),
        size: 48
      },
      {
        text: t('shop.price'),
        size: 13.25
      },
      {
        text: t('shop.quantity'),
        size: 22.75
      },
      {
        text: t('shop.subtotal'),
        size: 9,
        flexType: 'flex-end'
      }
    ],
    [t]
  )

  useEffect(() => {
    if (!totalSkinsInOrder) {
      closeDialog()
    }
  }, [totalSkinsInOrder])

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'purple1',
          justifyContent: 'flex-start',
          position: 'relative',
          flexWrap: 'nowrap'
        }),
        MintHeroesDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            width: 'full',
            backgroundColor: 'purple2',
            position: 'relative',
            borderBottom: '1px solid',
            borderColor: 'purple7'
          }),
          MintHeroesHeaderStyle
        )}
      >
        <MintHeroesModalHeader />
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          flexDirection: 'column',
          backgroundColor: 'purple1',
          position: 'relative',
          flexWrap: 'nowrap',
          overflow: 'auto',
          flex: 1
        })}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            backgroundColor: 'purple1',
            overflow: 'auto',
            top: 0,
            position: 'sticky',
            paddingY: '8px',
            paddingX: { base: '8px', tablet: '16px' }
          })}
        >
          {tableHeaders.map(({ size, text, flexType, secondaryText }) => (
            <div
              key={text}
              className={Sprinkles({
                display: 'flex',
                width: 'full'
              })}
              style={{
                width: `${size}%`,
                justifyContent: flexType ?? 'flex-start'
              }}
            >
              <Text color="white" fontSize={'14px'} fontWeight={'500'}>
                {text}
              </Text>
              {secondaryText && (
                <Text
                  color="purple8"
                  fontSize={'14px'}
                  fontWeight={'500'}
                  className={Sprinkles({
                    marginLeft: '4px'
                  })}
                >
                  {secondaryText}
                </Text>
              )}
            </div>
          ))}
        </div>
        <HeroesToMintList />
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            borderBottom: '1px solid',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            paddingX: { base: '8px', tablet: '16px' },
            borderColor: 'purple4',
            paddingY: '20px'
          })}
        >
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                height: 'full',
                justifyContent: 'center',
                flex: 1
              }),
              MintHeroesSkinsStyle
            )}
          >
            <Icon type="alert-stroke" color="purple9" height="16px" />
            <Text
              color="pink6"
              fontSize={'14px'}
              fontWeight={'500'}
              className={Sprinkles({ marginLeft: '4px' })}
            >
              {t('heroFeature.maxSkinsInCart')}
            </Text>
          </div>
        </div>
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          flexDirection: 'column',
          backgroundColor: 'purple1',
          position: 'relative',
          flexWrap: 'nowrap',
          overflow: 'auto',
          justifyContent: 'flex-end'
        })}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            backgroundColor: 'purple4',
            borderTop: '1px solid',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingX: '16px',
            borderColor: 'purple7',
            paddingY: { base: '8px', tablet: '20px' }
          })}
        >
          <MintHeroesModalTotal />
        </div>
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              width: 'full',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid',
              borderColor: 'purple7',
              overflow: 'hidden',
              position: 'relative',
              paddingLeft: '16px',
              paddingRight: '12px',
              zIndex: 1
            }),
            MintHeroesControlsStyle
          )}
        >
          <MintHeroesModalControls />
        </div>
      </div>
    </div>
  )
})

MintHeroesDialog.displayName = 'MintHeroesDialog'
