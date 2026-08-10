import { createWriteStream, readdirSync } from 'fs-extra'
import * as path from 'path'

const season = 20

const updatedBy = '0x450cb9fbb2d44d166aaca1f6cdb1dbd9ff168e4c' //not sure why
const updatedOn = new Date().toISOString().replace('T', ' ').split('.')[0]

const migrationsDir = path.resolve(
  __dirname,
  '../../../api/data/schema/migrations/'
)
const oldMigrationsHighestID = readdirSync(migrationsDir)
  .filter(fname => fname.includes('_') && fname.includes('.sql'))
  .reduce(
    (highest, fname) => Math.max(highest, parseInt(fname.split('_')[0], 10)),
    0
  )
const targetFile = path.resolve(
  migrationsDir,
  `${oldMigrationsHighestID + 1}_skypass_rewards_season_${season}.sql`
)

const key = [
  'Level',
  'Tier',
  'Item Type',
  'Amount',
  'Is Starter',
  'Token IDs',
  'Card Sets',
  'Excluded Card Sets'
] as const

const dataString = `
Level,Tier,Item Type,Amount,Is Starter,Token IDs,Card Sets,Excluded Card Sets
0,FREE,SW_BASE_CARDS,,,4132,HEXBOUND_INVASION,
0,PREMIUM,SW_BASE_CARDS,5,,,HEXBOUND_INVASION,
1,FREE,SW_BASE_CARDS,,1,2,,
1,FREE,SW_BASE_CARDS,2,,,,HEXBOUND_INVASION
2,FREE,SW_BASE_CARDS,,1,36,,
2,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
2,PREMIUM,SW_STICKERS,,,41,,
3,FREE,SW_BASE_CARDS,,1,96,,
3,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
3,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
4,FREE,SW_BASE_CARDS,,1,67,,
4,FREE,SW_STICKER_POINTS,25,,,,
4,PREMIUM,SW_BASE_CARDS,1,,,HEXBOUND_INVASION,
5,FREE,SW_BASE_CARDS,,1,18,,
5,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
5,PREMIUM,SW_SILVER_CARDS,1,,,HEXBOUND_INVASION,
6,FREE,SW_HERO,,1,2,,
6,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
7,FREE,SW_BASE_CARDS,,1,1100,,
7,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
8,FREE,SW_BASE_CARDS,,1,1042,,
8,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
8,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
9,FREE,SW_BASE_CARDS,,1,1093,,
9,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
9,PREMIUM,SW_STICKER_POINTS,25,,,,
10,FREE,SW_BASE_CARDS,,1,1117,,HEXBOUND_INVASION
10,FREE,SW_BASE_CARDS,2,,,,HEXBOUND_INVASION
11,FREE,SW_BASE_CARDS,,1,1104,,
11,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
11,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
12,FREE,SW_HERO,,1,7,,
12,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
13,FREE,SW_BASE_CARDS,,1,4118,,
13,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
14,FREE,SW_BASE_CARDS,,1,4092,,
14,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
14,PREMIUM,SW_BASE_CARDS,,,133,HEXBOUND_INVASION,
15,FREE,SW_BASE_CARDS,,1,4107,,
15,FREE,SW_BASE_CARDS,1,,,HEXBOUND_INVASION,
16,FREE,SW_BASE_CARDS,,1,4109,,
16,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
17,FREE,SW_BASE_CARDS,,1,4052,,
17,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
18,FREE,SW_HERO,,1,11,,
18,FREE,SW_BASE_CARDS,1,,,,
19,FREE,SW_BASE_CARDS,,1,2105,,
19,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
19,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
20,FREE,SW_BASE_CARDS,,1,2110,,
20,FREE,SW_BASE_CARDS,2,,,,HEXBOUND_INVASION
20,PREMIUM,SW_CONQUEST_TICKET,1,,,,
21,FREE,SW_BASE_CARDS,,1,2114,,
21,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
21,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
22,FREE,SW_BASE_CARDS,,1,2043,,
22,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
23,FREE,SW_BASE_CARDS,,1,2011,,
23,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
24,FREE,SW_HERO,,1,4,,
24,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
24,PREMIUM,SW_BASE_CARDS,,,1132,HEXBOUND_INVASION,
25,FREE,SW_BASE_CARDS,,1,3060,,
25,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
26,FREE,SW_BASE_CARDS,,1,3009,,
26,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
27,FREE,SW_BASE_CARDS,,1,3119,,
27,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
27,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
28,FREE,SW_BASE_CARDS,,1,3015,,
28,FREE,SW_STICKER_POINTS,25,,,,
28,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
29,FREE,SW_BASE_CARDS,,1,3049,,
29,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
30,FREE,SW_HERO,,1,3,,
30,FREE,SW_BASE_CARDS,2,,,HEXBOUND_INVASION,
31,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
31,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
31,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
32,FREE,SW_HERO,,1,5,,
32,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
32,PREMIUM,SW_CONQUEST_TICKET,1,,,,
33,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
33,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
34,FREE,SW_HERO,,1,6,,
34,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
34,PREMIUM,SW_BASE_CARDS,,,2132,HEXBOUND_INVASION,
35,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
35,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
36,FREE,SW_HERO,,1,8,,
36,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
36,PREMIUM,SW_STICKER_POINTS,25,,,,
37,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
37,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
37,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
38,FREE,SW_HERO,,1,9,,
38,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
39,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
39,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
40,FREE,SW_HERO,,1,10,,
40,FREE,SW_BASE_CARDS,2,,,,HEXBOUND_INVASION
40,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
41,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
41,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
42,FREE,SW_HERO,,1,12,,
42,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
42,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
43,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
43,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
43,PREMIUM,SW_CONQUEST_TICKET,1,,,,
44,FREE,SW_HERO,,1,13,,
44,PREMIUM,SW_BASE_CARDS,,,3132,HEXBOUND_INVASION,
45,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
45,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
46,FREE,SW_HERO,,1,14,,
46,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
46,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
47,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
47,FREE,SW_STICKER_POINTS,25,,,,
47,PREMIUM,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
48,FREE,SW_HERO,,1,15,,
48,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
49,FREE,SW_BASE_CARDS,2,1,,,HEXBOUND_INVASION
49,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
50,FREE,SW_BASE_CARDS,5,,,,HEXBOUND_INVASION
50,PREMIUM,SW_CARD_BACKS,,,5,,
100,FREE,SW_TITLES,,,5003,,
150,FREE,SW_TITLES,,,5004,,
200,FREE,SW_TITLES,,,5005,,
51,FREE,SW_BASE_CARDS,1,,,,HEXBOUND_INVASION
`
const records: string[] = []

const tierLookup = new Map([
  ['FREE', 1],
  ['PREMIUM', 2]
])

const itemTypeLookup = new Map([
  ['UNKNOWN', 0],
  ['USDC', 100],
  ['SW_BASE_CARDS', 300],
  ['SW_SKYPASS', 301],
  ['SW_TITLES', 302],
  ['SW_STICKER_POINTS', 303],
  ['SW_SILVER_DUST', 400],
  ['SW_SILVER_CARDS', 401],
  ['SW_GOLD_CARDS', 402],
  ['SW_CONQUEST_TICKET', 403],
  ['SW_CRYSTALS', 404],
  ['SW_STICKERS', 405],
  ['SW_HERO_SKINS', 406],
  ['SW_CARD_BACKS', 407],
  ['SW_HERO', 500],
  ['SW_HERO', 500]
])

// Omit tutorial cards from the SQL.
const rows = dataString.split('\n').filter(s => s)
if (key.join(',') !== rows[0]) {
  throw new Error('key in code does not match CSV data')
}

rows.shift()
for (const row of rows) {
  const chunks = row.split(',')
  const level = +chunks[key.indexOf('Level')]
  const tier = tierLookup.get(chunks[key.indexOf('Tier')])!
  const itemType = itemTypeLookup.get(chunks[key.indexOf('Item Type')])
  const amount = +chunks[key.indexOf('Amount')]
  const isStarter = +chunks[key.indexOf('Is Starter')] === 1
  const attributes: any = {}
  let attributesHasData = false
  const cardSets = chunks[key.indexOf('Card Sets')]
  if (cardSets) {
    attributes.cardSets = [cardSets]
    attributesHasData = true
  }
  const tokenIDs = chunks[key.indexOf('Token IDs')]
  if (tokenIDs) {
    attributes.tokenIDs = [+tokenIDs]
    attributesHasData = true
  }
  const cardSetsExcluded = chunks[key.indexOf('Excluded Card Sets')]
  if (cardSetsExcluded) {
    attributes.cardSetsExcluded = [cardSetsExcluded]
    attributesHasData = true
  }
  const isLast = rows.indexOf(row) === rows.length - 1
  const formatted = [
    level,
    season,
    tier,
    itemType,
    amount,
    isStarter,
    attributesHasData ? `'${JSON.stringify(attributes)}'` : 'null',
    `'${updatedOn}'`,
    `'${updatedBy}'`,
    isLast
  ].join(', ')
  const fullRecord = `INSERT INTO skypass_rewards (level, season, tier, item_type, amount, is_starter, attributes, updated_at, updated_by, is_infinite) VALUES (${formatted});`
  records.push(fullRecord)
}

const stream = createWriteStream(targetFile, { flags: 'ax' })
stream.write(`
-- +goose Up
-- THIS FILE IS GENERATED BY \`pnpm gen-skypass-rewards-sql\` IN /STATE
-- SQL in this section is executed when the migration is applied.

${records.join('\n')}
`)

stream.end()

console.log('[generated] ', targetFile)
