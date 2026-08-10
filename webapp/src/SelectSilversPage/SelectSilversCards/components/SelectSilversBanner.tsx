import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BackButton, SelectSilversBannerStyle } from './SelectSilversBanner.css'

export const SelectSilversBanner = memo(() => {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const goBack = useCallback(() => {
    dispatch(push(ROUTES_CONFIG.routes.PURCHASE_CONQUEST.directPath))
  }, [dispatch])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          borderBottom: '1px solid',
          borderColor: 'purple7',
          backgroundColor: 'purple1',
          position: 'relative'
        }),
        SelectSilversBannerStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0
          }),
          BackButton
        )}
      >
        <FancyBackButton onClick={goBack} />
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Text
          color="purple9"
          fontSize={{ base: '16px', tabletWide: '36px' }}
          fontFamily="condensed"
          fontWeight="600"
        >
          {t('play.chooseSilverCard')}
        </Text>
      </div>
    </div>
  )
})

SelectSilversBanner.displayName = 'SelectSilversBanner'
