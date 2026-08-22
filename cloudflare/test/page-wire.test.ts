import { SortOrder } from '@opensky/proto'
import { describe, expect, it } from 'vitest'

import { sourcePageWire, sourceResponsePageWire } from '../src/page-wire'

const SOURCE_PAGE_FIELDS = [
  'pageSize',
  'before',
  'hasBefore',
  'after',
  'hasAfter',
  'sort'
]

describe('source Page and SortBy JSON wire', () => {
  it('emits every generated field in source order', () => {
    const result = sourcePageWire({
      pageSize: 20,
      before: 'before-cursor',
      hasBefore: false,
      after: 'after-cursor',
      hasAfter: true,
      sort: [{ column: 'created_at', order: SortOrder.DESC }]
    })!

    expect(Object.keys(result)).toEqual(SOURCE_PAGE_FIELDS)
    expect(result).toStrictEqual({
      pageSize: 20,
      before: 'before-cursor',
      hasBefore: false,
      after: 'after-cursor',
      hasAfter: true,
      sort: [{ column: 'created_at', order: 'DESC' }]
    })
    expect(Object.keys(result.sort![0]!)).toEqual(['column', 'order'])
  })

  it('preserves nil pointers, slices, entries, and zero-value SortBy fields', () => {
    expect(sourcePageWire({})).toStrictEqual({
      pageSize: null,
      before: null,
      hasBefore: null,
      after: null,
      hasAfter: null,
      sort: null
    })
    expect(sourcePageWire({ sort: [null, {}] })).toStrictEqual({
      pageSize: null,
      before: null,
      hasBefore: null,
      after: null,
      hasAfter: null,
      sort: [null, { column: '', order: null }]
    })
    expect(sourcePageWire(null)).toBeNull()
  })

  it('completes only top-level paginated RPC response bodies', () => {
    expect(
      sourceResponsePageWire({
        page: { pageSize: 10, hasBefore: false, hasAfter: false, sort: [] },
        res: []
      })
    ).toStrictEqual({
      page: {
        pageSize: 10,
        before: null,
        hasBefore: false,
        after: null,
        hasAfter: false,
        sort: []
      },
      res: []
    })
    expect(sourceResponsePageWire({ page: undefined, res: [] })).toStrictEqual({
      page: null,
      res: []
    })
    expect(sourceResponsePageWire({ nested: { page: {} } })).toStrictEqual({
      nested: { page: {} }
    })
  })
})
