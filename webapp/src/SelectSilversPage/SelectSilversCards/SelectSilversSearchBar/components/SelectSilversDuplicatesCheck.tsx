import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Checkbox } from '~/shared/components/Checkbox'
import { makeSelectSilversRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux/index'
import {
  selectSilversFilterState,
  updateSelectSilversFilterState
} from '~/shared/state/select-silvers/select-silvers-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const SelectSilversDuplicateCheck = memo(() => {
  const { onlyDuplicates } = useSnapshot(selectSilversFilterState)

  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: boolean) => {
      updateSelectSilversFilterState('onlyDuplicates', !value)
      dispatch(push(makeSelectSilversRoute()))
    },
    [dispatch]
  )

  const { t } = useTranslation()

  return (
    <div
      className={Sprinkles({
        marginLeft: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      })}
    >
      <Checkbox
        isActive={onlyDuplicates}
        onChange={onChange}
        value={onlyDuplicates}
        text={t('search.MultipleOwned')}
      />
    </div>
  )
})

SelectSilversDuplicateCheck.displayName = 'SelectSilversDuplicateCheck'
