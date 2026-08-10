import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux/index'
import {
  selectGoldsState,
  updateSelectGoldsState
} from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CartControlsRowStyle } from './ConfirmGoldsControlsRow.css'

export const ConfirmGoldsControlsRow = memo(() => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { selectedCards } = useSnapshot(selectGoldsState)

  const onClear = useCallback(() => {
    updateSelectGoldsState('selectedCards', [])
  }, [])

  const onSubmit = useCallback(async () => {
    const { previousFeatureId } = selectGoldsState

    dispatch(push(makeHeroRoute(previousFeatureId || 1, true)))
  }, [dispatch])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: '16px',
          backgroundColor: 'purple1'
        }),
        CartControlsRowStyle
      )}
    >
      <div
        className={Sprinkles({
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
        onClick={onClear}
      >
        <Icon type="trash" color="purple9" height="16px" marginRight="4px" />
        <Text fontSize="16px" color="purple9">
          {t('generic.Clear')}
        </Text>
      </div>
      <Button
        colorType="blue"
        onClick={onSubmit}
        disabled={!selectedCards.length}
        frameType="default"
        text={t('heroFeature.confirmAndContinue')}
      />
    </div>
  )
})

ConfirmGoldsControlsRow.displayName = 'ConfirmGoldsControlsRow'
