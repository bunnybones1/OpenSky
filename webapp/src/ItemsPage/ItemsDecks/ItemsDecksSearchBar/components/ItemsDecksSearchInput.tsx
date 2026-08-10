import debounce from 'lodash-es/debounce'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Input } from '~/shared/components/Input/Input'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useDispatch } from '~/shared/redux'
import {
  itemsDecksFilterState,
  updateItemsDecksFilter
} from '~/shared/state/items-decks/items-decks-filter-state'

import { ItemsDecksSearchInputStyle } from './ItemsDecksSearchInput.css'

const LeftIcon = { type: 'search' } as const

export const ItemsDecksSearchInput = memo(() => {
  const { search } = useSnapshot(itemsDecksFilterState)
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState(search || '')
  const dispatch = useDispatch()

  const updateSearchState = useCallback(
    (value: string) => {
      updateItemsDecksFilter('search', value)
      dispatch(push(makeItemsDecksRoute()))
    },
    [dispatch]
  )

  const debouncedUpdateSearch = useMemo(
    () => debounce(updateSearchState, 400),
    [updateSearchState]
  )

  const onChange = useCallback(
    (value: string) => {
      setSearchText(value)
      debouncedUpdateSearch(value)
    },
    [debouncedUpdateSearch]
  )

  useEffect(() => {
    setSearchText((_searchText) => {
      if (!!search && search !== _searchText) {
        return search
      }
      return _searchText
    })
  }, [search])

  const onClear = useCallback(() => {
    setSearchText('')
    updateSearchState('')
  }, [updateSearchState])

  return (
    <Input
      inputClassname={ItemsDecksSearchInputStyle}
      value={searchText}
      onChange={onChange}
      onClear={onClear}
      inputId="search-decks"
      leftIcon={LeftIcon}
      placeholder={t('generic.Search')}
    />
  )
})

ItemsDecksSearchInput.displayName = 'ItemsDecksSearchInput'
