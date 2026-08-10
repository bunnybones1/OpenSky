import { CardBack } from '@opensky/design-data/schema/cardback/index'
import { cardBackID } from '@opensky/design-data/schema/cellTypes'
import * as t from 'myzod'
import { textEditor } from 'react-data-grid'

import { ArtSlugPreview } from '../cellRenderers/ArtSlugPreview'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<CardBack> = [
  { key: 'id', name: 'ID', width: 60 },
  {
    key: 'artSlug',
    name: 'Art',
    width: 160,
    renderCell: ArtSlugPreview,
    renderEditCell: textEditor
  },
  { key: 'name', name: 'Name', width: 160, renderEditCell: textEditor },
  { key: 'flavorText', name: 'Flavor Text', renderEditCell: textEditor }
]

export const cardBacksSheetDescription: SheetDescription<t.StringType, CardBack> = {
  name: 'CardBacks',
  columns,
  sheetArray: 'cardBacks',
  primaryKeySchema: cardBackID,
  newRow: (_id) => ({
    artSlug: '',
    flavorText: '',
    name: ''
  }),
  idsFromRange: (_start, _end) => []
}
