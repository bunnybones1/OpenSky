/* eslint-disable valtio/state-snapshot-rule */
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { CardSearchParams, OwnershipFilter } from '~/shared/types/cards'

import { OwnershipFilterSelectStyle } from './OwnershipFilterSelect.css'

const DEFAULT_ALLOWED_OPTIONS: OwnershipFilter[] = [
  OwnershipFilter.OWNED,
  OwnershipFilter.LOCKED,
  OwnershipFilter.ALL
]

interface OwnershipFilterSwitchProps {
  ownership?: OwnershipFilter
  ownedText: string
  onChange: (value: CardSearchParams['ownership']) => void
  allowedOptions?: OwnershipFilter[]
}

export const OwnershipFilterSelect = memo(
  ({
    ownership,
    onChange,
    ownedText,
    allowedOptions = DEFAULT_ALLOWED_OPTIONS
  }: OwnershipFilterSwitchProps) => {
    const { t } = useTranslation()

    const selectText = useMemo(() => {
      if (ownership === OwnershipFilter.OWNED) return ownedText
      if (ownership === OwnershipFilter.LOCKED) return t('generic.Locked')
      if (ownership === OwnershipFilter.ALL) return t('generic.All')
      if (ownership === OwnershipFilter.SELECTED) return t('generic.Selected')

      return
    }, [ownedText, ownership, t])

    return (
      <Select
        colorType="default"
        text={selectText}
        value={ownership}
        onChange={onChange}
        optionsMatchParentWidth
        className={OwnershipFilterSelectStyle}
      >
        {!!allowedOptions.includes(OwnershipFilter.OWNED) && (
          <SelectOption value={OwnershipFilter.OWNED} text={ownedText} />
        )}
        {!!allowedOptions.includes(OwnershipFilter.LOCKED) && (
          <SelectOption value={OwnershipFilter.LOCKED} text={t('generic.Locked')} />
        )}
        {!!allowedOptions.includes(OwnershipFilter.ALL) && (
          <SelectOption value={OwnershipFilter.ALL} text={t('generic.All')} />
        )}
        {!!allowedOptions.includes(OwnershipFilter.SELECTED) && (
          <SelectOption
            value={OwnershipFilter.SELECTED}
            text={t('generic.Selected')}
          />
        )}
      </Select>
    )
  }
)

OwnershipFilterSelect.displayName = 'OwnershipFilterSelect'
