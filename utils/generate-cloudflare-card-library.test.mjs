import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cardsFromRows,
  parseCardRows
} from './generate-cloudflare-card-library.mjs'

test('parses SQL apostrophes, commas, newlines, and nulls without changing source text', () => {
  const sql = `INSERT INTO cards
    ("id") VALUES
    ('7','Fate''s Test','Line one,\nline two','','asset','2','1','0','3','4','5',null,'{GUARD, WITHER}','0','$','[]','2','0');`
  const [row] = parseCardRows(sql)
  assert.equal(row[1], "Fate's Test")
  assert.equal(row[2], 'Line one,\nline two')
  assert.equal(row[11], null)
  assert.equal(row[12], '{GUARD, WITHER}')
})

test('maps only source PLAY cards in active source classes', () => {
  const active = [
    '1', 'One', '', '', 'one', '0', '1', '0', '2', '3', '4', null,
    '{GUARD}', '0', '$', '[]', '1', '0'
  ]
  const blocked = [...active]
  blocked[0] = '2'
  blocked[13] = '1'
  const token = [...active]
  token[0] = '3'
  token[5] = '5'

  const cards = cardsFromRows([active, blocked, token])
  assert.deepEqual(cards.map(card => card.id), [1])
  assert.equal(cards[0].class, 'STR')
  assert.equal(cards[0].element, 'FIRE')
  assert.equal(cards[0].type, 'UNIT')
  assert.deepEqual(cards[0].keywords, ['GUARD'])
  assert.equal(cards[0].silverCardTokenId, 65_537)
  assert.equal(cards[0].goldCardTokenId, 131_073)
})
