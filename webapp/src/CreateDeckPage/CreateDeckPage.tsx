import clsx from 'clsx'
import { memo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CreateDeckBackButton } from './components/CreateDeckBackButton'
import { DeckStringInput } from './components/DeckStringInput'
import { HeroDisplay } from './components/HeroDisplay'
import {
  CreateDeckPageHeader,
  CreateDeckPageStyle,
  CreateDeckPageWrapper,
  CreateDeckTitle
} from './CreateDeckPage.css'
import { HeroSelect } from './HeroSelect/HeroSelect'
import { PrismDescription } from './PrismDescription/PrismDescription'
import PrismSelector from './PrismSelector/PrismSelector'
import { resetCreateDeckState } from './shared/state/create-deck-state'

export const CreateDeckPage = memo(() => {
  const { t } = useTranslation()
  const isTablet = useResponsiveQuery('tablet')

  const { getAssetUrl } = useGetAssetContext()

  useEffect(() => {
    return () => {
      resetCreateDeckState()
    }
  }, [])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          flexWrap: 'nowrap'
        }),
        CreateDeckPageWrapper
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            backgroundColor: 'purple1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            paddingX: { base: '8px', mobile: '12px', tabletWide: '24px' }
          }),
          CreateDeckPageHeader
        )}
      >
        <CreateDeckBackButton />
        <div
          className={clsx(
            Sprinkles({
              color: 'purple9',
              fontWeight: '700',
              fontSize: { base: '22px', tablet: '26px', tabletWide: '36px' },
              fontFamily: 'condensed',
              position: 'absolute',
              zIndex: 1
            }),
            CreateDeckTitle
          )}
        >
          {t('createDeck.title')}
        </div>
        <DeckStringInput />
      </div>
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: 'full',
            flex: 1,
            flexWrap: 'nowrap'
          }),
          CreateDeckPageStyle
        )}
        style={{
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/create-deck.webp')})`
            : undefined
        }}
      >
        {isTablet && <PrismSelector />}
        <div
          className={Sprinkles({
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'full',
            position: 'relative',
            flex: 1
          })}
        >
          <HeroSelect />
        </div>
        <HeroDisplay />
        <PrismDescription />
      </div>
    </div>
  )
})

CreateDeckPage.displayName = 'CreateDeckPage'
