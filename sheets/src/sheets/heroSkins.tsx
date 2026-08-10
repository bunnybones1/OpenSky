import { heroSkinID } from '@opensky/design-data/schema/cellTypes'
import { HeroSkin } from '@opensky/design-data/schema/heroskin/index'
import * as t from 'myzod'
import { textEditor } from 'react-data-grid'

import { ArtSlugPreview } from '../cellRenderers/ArtSlugPreview'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<HeroSkin> = [
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

export const heroSkinsSheetDescription: SheetDescription<t.StringType, HeroSkin> = {
  name: 'HeroSkins',
  columns,
  sheetArray: 'heroSkins',
  primaryKeySchema: heroSkinID,
  newRow: (_id) => ({
    artSlug: '',
    name: '',
    flavorText: '',
    grade: 'base',
    hero: 'ada'
  }),
  idsFromRange: (_start, _end) => []
}
