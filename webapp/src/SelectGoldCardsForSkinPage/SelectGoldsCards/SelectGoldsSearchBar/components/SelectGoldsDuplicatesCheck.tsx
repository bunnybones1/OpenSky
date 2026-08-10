import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Checkbox } from '~/shared/components/Checkbox'
import { makeSelectGoldsRoute } from '~/shared/helpers/routes/general'
import { useDispatch } from '~/shared/redux/index'
import {
  selectGoldsFilterState,
  updateSelectGoldsFilterState
} from '~/shared/state/select-golds/select-golds-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const SelectGoldsDuplicatesCheck = memo(() => {
  const { onlyDuplicates } = useSnapshot(selectGoldsFilterState)

  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: boolean) => {
      updateSelectGoldsFilterState('onlyDuplicates', !value)
      dispatch(push(makeSelectGoldsRoute()))
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

SelectGoldsDuplicatesCheck.displayName = 'SelectGoldsDuplicatesCheck'
