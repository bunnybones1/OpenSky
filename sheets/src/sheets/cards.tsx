import { Card } from '@opensky/design-data/schema'
import { cardID } from '@opensky/design-data/schema/cellTypes'
import { prismFromCardID } from '@opensky/design-data/schema/helpers'
import {
  draftPoolType,
  elements,
  gameDesignStatus,
  prisms,
  sets,
  spellBehaviours,
  traits,
  types
} from '@opensky/design-data/schema/options'
import { Immutable } from 'immer'
import { StringType } from 'myzod'
import { textEditor } from 'react-data-grid'

import { ArtSlugPreview } from '../cellRenderers/ArtSlugPreview'
import { AttachmentEditor } from '../cellRenderers/AttachmentEditor'
import { AttachmentPreview } from '../cellRenderers/AttachmentPreview'
import { BigTextPreview } from '../cellRenderers/BigTextPreview'
import { CardDescriptionText } from '../cellRenderers/CardDescription'
import { CardNamePreview } from '../cellRenderers/CardNamePreview'
import { ElementPreview } from '../cellRenderers/ElementPreview'
import { makeForeignLookup } from '../cellRenderers/makeForeignLookup'
import { makeGradientValue } from '../cellRenderers/makeGradientValue'
import { makeStaticListPicker } from '../cellRenderers/makeStaticListPicker'
import { ManaCrystalEditor } from '../cellRenderers/ManaCrystalEditor'
import { ManaCrystalPreview } from '../cellRenderers/ManaCrystalPreview'
import MultilineTextEditor from '../cellRenderers/MultilineTextEditor'
import { PrismPreview } from '../cellRenderers/PrismPreview'
import { SaturatingU8Editor } from '../cellRenderers/SaturatingU8Editor'
import { TraitsViewer } from '../cellRenderers/TraitsViewer'
import { TypePreview } from '../cellRenderers/TypePreview'
import { ManaFilter } from '../filters/ManaFilter'
import { makeMultiDropdownFilter } from '../filters/MultiDropdownFilter'
import { NumberFilter } from '../filters/NumberFilter'
import { NumberFilterWithEmptyOption } from '../filters/NumberFilterWithEmptyOption'
import { makeSingleDropdownFilter } from '../filters/SingleDropdownFilter'
import { TextFilter } from '../filters/TextFilter'
import { TextFilterWithEmptyOption } from '../filters/TextFilterWithEmptyOption'
import { store } from '../stores/designData'
import { ColumnsWithIdAndFilter, SheetDescription } from './types'

const columns: ColumnsWithIdAndFilter<Card> = [
  {
    key: 'id',
    name: 'ID',
    width: 10
  },
  {
    key: 'artSlug',
    name: 'Art',
    renderCell: (props) => <ArtSlugPreview {...props} />,
    renderEditCell: textEditor,
    width: 100,
    filter: TextFilter
  },
  {
    key: 'name',
    name: 'Name',
    renderCell: (props) => <CardNamePreview {...props} />,
    renderEditCell: textEditor,
    width: 170,
    filter: TextFilter
  },
  {
    key: 'cost',
    name: 'Mana',
    renderCell: (props) => <ManaCrystalPreview {...props} />,
    renderEditCell: ManaCrystalEditor,
    width: 64,
    filter: ManaFilter
  },
  {
    key: 'power',
    name: 'Power',
    renderCell: makeGradientValue(10, [255, 242, 204], [228, 171, 0]),
    renderEditCell: SaturatingU8Editor,
    width: 64,
    filter: NumberFilter
  },
  {
    key: 'health',
    name: 'Health',
    renderCell: makeGradientValue(10, [244, 204, 204], [204, 0, 0]),
    renderEditCell: SaturatingU8Editor,
    width: 64,
    filter: NumberFilter
  },
  {
    key: 'startCharges',
    name: 'Start Charges',
    renderCell: makeGradientValue(10, [255, 242, 204], [228, 171, 0]),
    renderEditCell: SaturatingU8Editor,
    width: 64,
    filter: NumberFilterWithEmptyOption
  },
  {
    key: 'maxCharges',
    name: 'Max Charges',
    renderCell: makeGradientValue(10, [255, 242, 204], [228, 171, 0]),
    renderEditCell: SaturatingU8Editor,
    width: 64,
    filter: NumberFilterWithEmptyOption
  },
  {
    key: 'startCounters',
    name: 'Start Counters',
    renderCell: makeGradientValue(10, [255, 242, 204], [228, 171, 0]),
    renderEditCell: SaturatingU8Editor,
    width: 64,
    filter: NumberFilterWithEmptyOption
  },
  {
    key: 'maxCounters',
    name: 'Max Counters',
    renderCell: makeGradientValue(10, [255, 242, 204], [228, 171, 0]),
    renderEditCell: SaturatingU8Editor,
    width: 64,
    filter: NumberFilterWithEmptyOption
  },
  {
    key: 'text',
    name: 'Text',
    renderCell: (props) => <CardDescriptionText {...props} />,
    renderEditCell: MultilineTextEditor,
    width: 180,
    filter: TextFilterWithEmptyOption
  },
  {
    key: 'traits',
    name: 'Traits',
    renderCell: (props) => <TraitsViewer {...props} />,
    renderEditCell: makeStaticListPicker(
      traits.map((t) => ({ name: t, value: t })),
      { allowMultiple: true }
    ),
    width: 67,
    filter: makeMultiDropdownFilter('cards', 'traits')
  },
  {
    key: 'attachment',
    name: 'Attachment',
    renderCell: (props) => <AttachmentPreview {...props} />,
    renderEditCell: AttachmentEditor,
    width: 90,
    filter: makeSingleDropdownFilter(
      'cards',
      'attachment',
      (val) => store.value.sheets.cards[val]?.name
    )
  },
  {
    key: 'prism',
    name: 'Prism',
    renderCell: (props) => <PrismPreview {...props} />,
    renderEditCell: makeStaticListPicker(prisms.map((p) => ({ name: p, value: p }))),
    width: 60,
    filter: makeSingleDropdownFilter('cards', 'prism')
  },
  {
    key: 'element',
    name: 'Element',
    renderCell: (props) => <ElementPreview {...props} />,
    renderEditCell: makeStaticListPicker(
      elements.map((p) => ({ name: p, value: p }))
    ),
    width: 60,
    filter: makeSingleDropdownFilter('cards', 'element')
  },
  {
    key: 'type',
    name: 'Type',
    renderCell: (props) => <TypePreview {...props} />,
    renderEditCell: makeStaticListPicker(types.map((p) => ({ name: p, value: p }))),
    width: 60,
    filter: makeSingleDropdownFilter('cards', 'type')
  },
  {
    key: 'draftPoolType',
    name: 'Draft Pool Type',
    renderEditCell: makeStaticListPicker(
      draftPoolType.map((p) => ({ name: p, value: p })),
      { allowNull: true }
    ),
    width: 87,
    filter: makeSingleDropdownFilter('cards', 'draftPoolType')
  },
  {
    key: 'notes',
    name: 'Notes',
    renderEditCell: textEditor,
    width: 300,
    filter: TextFilter
  },
  {
    key: 'gameDesignStatus',
    name: 'Status',
    renderEditCell: makeStaticListPicker(
      gameDesignStatus.map((p) => ({ name: p, value: p })),
      { allowNull: true }
    ),
    width: 87,
    filter: makeSingleDropdownFilter('cards', 'gameDesignStatus')
  },
  {
    key: 'spellBehaviour',
    name: 'Spell Behaviour (for bot)',
    renderEditCell: makeStaticListPicker(
      spellBehaviours.map((p) => ({ name: p, value: p })),
      { allowNull: true }
    ),
    width: 87,
    filter: makeSingleDropdownFilter('cards', 'spellBehaviour')
  },
  {
    key: 'flavorText',
    name: 'Flavor Text',
    renderCell: (props) => <CardDescriptionText {...props} />,
    renderEditCell: textEditor,
    minWidth: 180,
    filter: TextFilter
  },
  {
    synthetic: true,
    key: 'artStatus',
    name: 'Art Status',
    renderCell: makeForeignLookup<Immutable<Card>, 'art'>(
      (row) => row.artSlug,
      'art',
      (r) => <>{r.status}</>
    ),
    width: 70
  },
  {
    key: 'set',
    name: 'Set',
    renderEditCell: makeStaticListPicker(sets.map((p) => ({ name: p, value: p }))),
    width: 150,
    filter: makeSingleDropdownFilter('cards', 'set')
  },
  {
    key: 'releaseSeason',
    name: 'Release Season',
    renderCell: (props) => <BigTextPreview {...props} />,
    renderEditCell: SaturatingU8Editor,
    width: 40,
    filter: NumberFilter
  }
]

export const cardsSheetDescription: SheetDescription<StringType, Card> = {
  name: 'Cards',
  columns,
  sheetArray: 'cards',
  primaryKeySchema: cardID,
  newRow: (id) => {
    const prism = prismFromCardID(id)
    return {
      artSlug: 'spell-case-113',
      cost: 0,
      element: 'sky',
      flavorText: '',
      name: 'New Row',
      prism: prism === null ? ('' as 'tok') : prism,
      releaseSeason: 0,
      set: 'Core Set',
      traits: [],
      type: 'spell'
    }
  },
  idsFromRange: (start, end) => {
    const startNum = Number.parseInt(start, 10)
    const endNum = Number.parseInt(end, 10)
    if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
      return []
    }
    const length = endNum - startNum + 1
    return Array.from({ length }, (_, i) => `${startNum + i}`)
  }
}
