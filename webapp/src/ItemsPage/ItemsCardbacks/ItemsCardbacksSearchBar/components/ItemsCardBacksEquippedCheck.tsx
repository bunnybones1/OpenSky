import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Checkbox } from '~/shared/components/Checkbox'
import { makeItemsCardBacksRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux/index'
import {
  itemsCardbacksFilterState,
  updateItemsCardbacksFilters
} from '~/shared/state/items-cardbacks/items-cardbacks-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const ItemsCardBacksEquippedCheck = memo(() => {
  const { isEquipped } = useSnapshot(itemsCardbacksFilterState)

  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: boolean) => {
      updateItemsCardbacksFilters('isEquipped', !value)
      dispatch(push(makeItemsCardBacksRoute()))
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
        isActive={isEquipped}
        onChange={onChange}
        value={isEquipped}
        text={t('generic.OnlyEquipped')}
      />
    </div>
  )
})

ItemsCardBacksEquippedCheck.displayName = 'ItemsCardBacksEquippedCheck'
