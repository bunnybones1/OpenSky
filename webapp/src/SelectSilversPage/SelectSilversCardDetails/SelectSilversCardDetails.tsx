import { ItemType } from '@opensky/proto'
import { memo } from 'react'

import { CardDetailsPage } from '~/shared/components/CardDetailsPage/CardDetailsPage'
import { useSelector } from '~/shared/redux/index'

import { SelectSilverCardDetailsControls } from './components/SelectSilverCardDetailsControls'
import { selectSilversCardDetailsIdSelector } from './selectors/selectSilversCardDetailsIdSelector'

const ALLOWED_GRADE = [ItemType.SW_SILVER_CARDS] as (
  | ItemType.SW_SILVER_CARDS
  | ItemType.SW_BASE_CARDS
  | ItemType.SW_GOLD_CARDS
)[]

export const SelectSilversCardDetails = memo(() => {
  const id = useSelector(selectSilversCardDetailsIdSelector)

  if (!id) return null

  return (
    <CardDetailsPage
      Controls={SelectSilverCardDetailsControls}
      id={id}
      allowedGrades={ALLOWED_GRADE}
    />
  )
})

SelectSilversCardDetails.displayName = 'SelectSilversCardDetails'
