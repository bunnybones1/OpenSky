import { ItemType } from '@opensky/proto'
import { memo } from 'react'

import { CardDetailsPage } from '~/shared/components/CardDetailsPage/CardDetailsPage'
import { useSelector } from '~/shared/redux/index'

import { SelectGoldCardDetailsControls } from './components/SelectGoldCardDetailsControls'
import { selectGoldsCardDetailsIdSelector } from './selectors/selectGoldsCardDetailsIdSelector'

const ALLOWED_GRADE = [ItemType.SW_GOLD_CARDS] as (
  | ItemType.SW_SILVER_CARDS
  | ItemType.SW_BASE_CARDS
  | ItemType.SW_GOLD_CARDS
)[]

export const SelectGoldsCardDetails = memo(() => {
  const id = useSelector(selectGoldsCardDetailsIdSelector)

  if (!id) return null

  return (
    <CardDetailsPage
      Controls={SelectGoldCardDetailsControls}
      id={id}
      allowedGrades={ALLOWED_GRADE}
    />
  )
})

SelectGoldsCardDetails.displayName = 'SelectGoldsCardDetails'
