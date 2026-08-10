/* eslint-disable valtio/state-snapshot-rule */
import { PrismClass } from '@opensky/shared/constants'
import { getDeckClassFromPrisms } from '@opensky/shared/helpers'
import uniq from 'lodash-es/uniq'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FilterablePrism } from '~/shared/types/cards'

import { ToggleButton } from '../ToggleButton'
import { ToggleButtonGroup } from '../ToggleButtonGroup'
import { ItemsPrismFilterStyle } from './ItemsPrismFilter.css'

const ADORNMENTS = {
  str: 'webapp/icons/prisms/small/STR.webp',
  agy: 'webapp/icons/prisms/small/AGY.webp',
  wis: 'webapp/icons/prisms/small/WIS.webp',
  hrt: 'webapp/icons/prisms/small/HRT.webp',
  int: 'webapp/icons/prisms/small/INT.webp'
} as const

const ALL_ICON = 'webapp/icons/prisms/small/ALL.webp'

const DEFAULT_PRISMS: FilterablePrism[] = ['str', 'agy', 'wis', 'hrt', 'int']

interface ItemsPrismFilterProps {
  onChange: (value: FilterablePrism[]) => void
  prism?: FilterablePrism[]
  validPrisms?: FilterablePrism[]
}

const ToolTipPadding = { top: NAVBAR_HEIGHT, bottom: 0, left: 0, right: 0 } as const

export const ItemsPrismFilter = memo(
  ({ onChange, prism, validPrisms }: ItemsPrismFilterProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { t } = useTranslation()
    const { getAssetUrl } = useGetAssetContext()

    const updatePrism = useCallback(
      (value: FilterablePrism) => {
        let newPrisms: FilterablePrism[] = []
        if (prism && prism.includes(value)) {
          newPrisms = prism.filter((_prism) => _prism !== value)
        } else if (prism?.length == 2) {
          newPrisms = [prism[1], value]
        } else {
          newPrisms = uniq([...(prism || []), value])
        }

        onChange(newPrisms)
      },
      [onChange, prism]
    )

    const options = useMemo(() => {
      if (!!validPrisms) return validPrisms
      return DEFAULT_PRISMS
    }, [validPrisms])

    const adornment = useMemo(() => {
      if (!getAssetUrl) return undefined
      if (!prism) return { image: getAssetUrl(ALL_ICON) }

      const deckClass = getDeckClassFromPrisms(
        prism.map((p) => p.toUpperCase() as PrismClass)
      )

      if (!deckClass) return { image: getAssetUrl(ALL_ICON) }

      return {
        image: getAssetUrl(`webapp/icons/prisms/small/${deckClass}.webp`)
      }
    }, [getAssetUrl, prism])

    if (!isTabletWide) {
      return (
        <Select
          value={prism}
          colorType="default"
          adornmentHeight="24px"
          onChange={updatePrism}
          adornment={adornment}
          className={ItemsPrismFilterStyle}
          optionsMatchParentWidth={false}
          optionsPlacement="bottom-end"
        >
          {options.map((option) => (
            <SelectOption
              adornmentHeight="24px"
              value={option}
              text={t(`cards.prisms.${option}`)}
              adornment={
                !!getAssetUrl ? { image: getAssetUrl(ADORNMENTS[option]) } : undefined
              }
              key={option}
            />
          ))}
        </Select>
      )
    }

    return (
      <ToggleButtonGroup<FilterablePrism>
        value={prism}
        height="36px"
        colorType="default"
        onChange={updatePrism}
      >
        {options.map((option) => (
          <ToggleButton
            value={option}
            iconHeight="24px"
            tooltip={t(`cards.prisms.${option}`)}
            leftAdornment={
              !!getAssetUrl ? { image: getAssetUrl(ADORNMENTS[option]) } : undefined
            }
            tooltipPadding={ToolTipPadding}
            key={option}
          />
        ))}
      </ToggleButtonGroup>
    )
  }
)

ItemsPrismFilter.displayName = 'ItemsPrismFilter'
