import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Checkbox } from '~/shared/components/Checkbox'
import { makeItemsStickersRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux/index'
import {
  itemsStickersFilterState,
  updateItemsStickersFilters
} from '~/shared/state/items-stickers/items-stickers-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const ItemsStickersEquippedCheck = memo(() => {
  const { isEquipped } = useSnapshot(itemsStickersFilterState)

  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: boolean) => {
      updateItemsStickersFilters('isEquipped', !value)
      dispatch(push(makeItemsStickersRoute()))
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

ItemsStickersEquippedCheck.displayName = 'ItemsStickersEquippedCheck'
