import clsx from 'clsx'
import { HTMLAttributes, memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Skeleton from 'react-loading-skeleton'

import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'

import { Sprinkles } from '../style/Sprinkles.css'
import { THEME_COLORS } from '../style/Theme'
import { SeasonSelectOptions, SeasonSelectStyle } from './SeasonSelect.css'
import { Select } from './Select'
import { SelectOption } from './SelectOption'

interface SeasonSelectInterface extends HTMLAttributes<HTMLDivElement> {
  onChangeFn: (val) => void
  selectedSeason?: number
  optionsClassName?: string
}

export const SeasonSelect = memo(
  ({ onChangeFn, selectedSeason, optionsClassName }: SeasonSelectInterface) => {
    const { data: seasonInfo, isLoading } = useSeasonInfo()

    const { t } = useTranslation()

    const onChangeSeason = useCallback(
      (seasonToSelect: number): void => {
        onChangeFn(seasonToSelect)
      },
      [onChangeFn]
    )

    const seasonArray = useMemo(() => {
      return !seasonInfo
        ? []
        : Array.from(Array(seasonInfo.currentSeason).keys()).map(
            (i) => seasonInfo.currentSeason - i
          )
    }, [seasonInfo])

    if (isLoading) {
      return (
        <Skeleton
          height="36px"
          width="100%"
          baseColor={THEME_COLORS.purple5}
          highlightColor={THEME_COLORS.purple6}
        />
      )
    }

    if (!seasonArray.length) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }),
          SeasonSelectStyle
        )}
      >
        <Select
          text={
            selectedSeason === seasonInfo?.currentSeason
              ? t('ranks.CurrentSeason')
              : t('ranks.SeasonNum', { season: selectedSeason })
          }
          colorType="default"
          value={selectedSeason}
          onChange={onChangeSeason}
          isFullWidth
          optionsMatchParentWidth
          optionsClassName={optionsClassName ?? SeasonSelectOptions}
        >
          {seasonArray.map((season) => (
            <SelectOption
              key={season}
              value={season}
              text={
                season === seasonInfo?.currentSeason
                  ? t('ranks.CurrentSeason')
                  : t('ranks.SeasonNum', { season })
              }
            />
          ))}
        </Select>
      </div>
    )
  }
)

SeasonSelect.displayName = 'SeasonSelect'
