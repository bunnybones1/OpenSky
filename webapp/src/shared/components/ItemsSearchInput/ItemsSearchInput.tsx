import debounce from 'lodash-es/debounce'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '../Input/Input'
import { ItemsSearchInputStyle } from './ItemsSearchInput.css'

const LeftIcon = { type: 'search' } as const

interface ItemsSearchInputProps {
  search?: string
  onChange: (value: string) => void
}

export const ItemsSearchInput = memo(
  ({ search, onChange }: ItemsSearchInputProps) => {
    const { t } = useTranslation()
    const [searchText, setSearchText] = useState(search || '')

    const debouncedUpdateSearch = useMemo(() => debounce(onChange, 400), [onChange])

    const _onChange = useCallback(
      (value: string) => {
        setSearchText(value)
        debouncedUpdateSearch(value)
      },
      [debouncedUpdateSearch]
    )

    useEffect(() => {
      setSearchText((_searchText) => {
        if (search !== undefined && search !== _searchText) {
          return search
        }
        return _searchText
      })
    }, [search])

    const onClear = useCallback(() => {
      setSearchText('')
      onChange('')
    }, [onChange])

    return (
      <Input
        inputClassname={ItemsSearchInputStyle}
        value={searchText}
        onChange={_onChange}
        inputId="search-items"
        onClear={onClear}
        leftIcon={LeftIcon}
        placeholder={t('generic.Search')}
      />
    )
  }
)

ItemsSearchInput.displayName = 'ItemsSearchInput'
