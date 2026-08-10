import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { Text } from '~/shared/components/Text'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux/index'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BackButton, SelectGoldsBannerStyle } from './SelectGoldsBanner.css'

export const SelectGoldsBanner = memo(() => {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const goBack = useCallback(() => {
    if (!!selectGoldsState.previousFeatureId) {
      dispatch(push(makeHeroRoute(selectGoldsState.previousFeatureId)))
    } else {
      dispatch(push(makeHeroRoute(1)))
    }
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
        SelectGoldsBannerStyle
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
          {t('heroFeature.selectGoldCardsTitle')}
        </Text>
      </div>
    </div>
  )
})

SelectGoldsBanner.displayName = 'SelectGoldsBanner'
