import { crystalID } from '@opensky/design-data/schema/cellTypes'
import { Crystal } from '@opensky/design-data/schema/crystal/index'
import * as t from 'myzod'
import { textEditor } from 'react-data-grid'

import { ArtSlugPreview } from '../cellRenderers/ArtSlugPreview'
import { ColorPreview } from '../cellRenderers/ColorPreview'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<Crystal> = [
  { key: 'id', name: 'ID', width: 60 },
  {
    key: 'artSlug',
    name: 'Art',
    width: 160,
    renderCell: ArtSlugPreview,
    renderEditCell: textEditor
  },
  { key: 'name', name: 'Name', width: 160, renderEditCell: textEditor },
  {
    key: 'color',
    name: 'Color',
    width: 100,
    renderCell: ColorPreview,
    renderEditCell: textEditor
  },
  { key: 'flavorText', name: 'Flavor Text', renderEditCell: textEditor }
]

export const crystalsSheetDescription: SheetDescription<t.StringType, Crystal> = {
  name: 'Crystals',
  columns,
  sheetArray: 'crystals',
  primaryKeySchema: crystalID,
  newRow: (_id) => ({
    artSlug: '',
    color: '',
    flavorText: '',
    name: ''
  }),
  idsFromRange: (_start, _end) => []
}
