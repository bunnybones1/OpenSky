// TODO
// const fs = require('fs').promises

// import { downloadSheets } from '@opensky/tools/googleSheets'
// import { parse } from 'papaparse'
// import { createWriteStream, readdirSync } from 'fs-extra'
// import path from 'path'
// import { getGoldID } from '@opensky/shared/assetsIDs'
// import dayjs from 'dayjs'
// import utc from 'dayjs/plugin/utc'

// dayjs.extend(utc)

// const SHEET_HASH = '1I8oDfwg1yaHK5RdumKC2UnruDSxRk0vi8X8ZnJRB8q4'
// const SHEET_TAB = 'gold_mainnet'

// const migrationsDir = path.resolve(
//   __dirname,
//   '../../../api/data/schema/migrations/'
// )
// const oldMigrationsHighestID = readdirSync(migrationsDir)
//   .filter(fname => fname.includes('_') && fname.includes('.sql'))
//   .reduce(
//     (highest, fname) => Math.max(highest, parseInt(fname.split('_')[0], 10)),
//     0
//   )
// const targetFile = path.resolve(
//   migrationsDir,
//   `${oldMigrationsHighestID + 1}_weekly_gold_distribution.sql`
// )

// const goldsFile = path.resolve(__dirname, '../weekly_golds.json')

// const main = async () => {
//   console.log(
//     '-- generating sql migration for weekly gold card distributions --'
//   )

//   //https://docs.google.com/spreadsheets/d/1I8oDfwg1yaHK5RdumKC2UnruDSxRk0vi8X8ZnJRB8q4/
//   const content = await downloadSheets(SHEET_HASH, { weekly_golds: SHEET_TAB })
//   const parsed = parse(content.weekly_golds, { header: true })

//   const inserts: string[] = []
//   const newSheet: {
//     week: string
//     start: string
//     end: string
//     id: number
//   }[] = []

//   for (const week of parsed.data) {
//     let weekNumber
//     let start_at
//     let end_at

//     for (const [key, val] of Object.entries(week)) {
//       // to accomodate reduced slots
//       if (!val) {
//         continue
//       }
//       switch (key) {
//         case 'week_#':
//           weekNumber = val
//           break
//         case 'start_at':
//           start_at = dayjs(val as string)
//             .utc(true)
//             .toISOString()
//           break
//         case 'end_at':
//           end_at = dayjs(val as string)
//             .utc(true)
//             .toISOString()
//           break
//         default:
//           if (!key.includes('slot_')) {
//             throw new Error('invalid column')
//           }

//           if (!start_at || !end_at || !val) {
//             console.warn({
//               start_at,
//               end_at,
//               val
//             })
//             throw new Error('date range or card id not defined')
//           }

//           const cardID = getGoldID(Number(val))

//           inserts.push(
//             `INSERT INTO weekly_golds (start_at, end_at, token_id) VALUES('${start_at}'::timestamp, '${end_at}'::timestamp, ${cardID}) ON CONFLICT DO NOTHING;`
//           )

//           // Store all cards to do some validation
//           newSheet.push({
//             week: String(weekNumber),
//             start: String(start_at),
//             end: String(end_at),
//             id: Number(val)
//           })
//       }
//     }
//   }

//   //
//   //  VALIDATION
//   //

//   // 1. No change to pass weeks or current one
//   try {
//     const goldData = await fs.readFile(goldsFile, 'utf-8')
//     const oldSheet: {
//       week: string
//       start: string
//       end: string
//       id: number
//     }[] = JSON.parse(goldData.toString())
//     oldSheet.forEach((oldEntry, i) => {
//       if (Date.parse(oldEntry.start) <= Date.now()) {
//         if (JSON.stringify(oldEntry) !== JSON.stringify(newSheet[i])) {
//           throw new Error(`
//               \n\nActive or expired card was changed:
//               \n  Old entry: ${JSON.stringify(oldEntry)}
//               \n  New Entry: ${JSON.stringify(newSheet[i])}\n
//             `)
//         }
//       }
//     })
//   } catch (e) {
//     throw e
//   }

//   // 2. No gap in the schedule
//   const weeks = Array.from(new Set(newSheet.map(o => o.week)))
//   for (let i = 1; i < weeks.length; i++) {
//     const pastWeekEnd = newSheet.find(o => o.week === weeks[i - 1])!.end
//     const currentWeekStart = newSheet.find(o => o.week === weeks[i])!.start
//     if (pastWeekEnd !== currentWeekStart) {
//       throw new Error(`
//           \n\nGap in time where there are no cards:
//           \n..., ${pastWeekEnd}] --- [${currentWeekStart}, ...
//         `)
//     }
//   }

//   // 3. No duplicates
//   // NOTE: allow duplicates for now (pre FTP id reuse)
//   const cardIDs = newSheet.map(o => o.id)
//   // if ((new Set(cardIDs)).size != cardIDs.length) {
//   //   const duplicates = cardIDs.reduce( (acc: number[], el, i, arr) => {
//   //     if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc;
//   //   }, []);
//   //   throw new Error(`\n\nDuplicates detected:\n   ${duplicates}\n`)
//   // }

//   // 4. No token cards (e.g. enchants)
//   const tokenCards = cardIDs.filter(id => id >= 20000)
//   if (tokenCards.length > 0) {
//     throw new Error(`\n\nToken cards detected:\n   ${tokenCards}\n`)
//   }

//   //
//   //  SAVING
//   //

//   // 1. Saving weekly_golds.json for future validation
//   const newSheetData = JSON.stringify(newSheet)
//   try {
//     await fs.writeFile(goldsFile, newSheetData)
//     console.log('Weekly golds are saved.')
//   } catch (e) {
//     throw e
//   }

//   // 2. Creating SQL migration
//   const stream = createWriteStream(targetFile, { flags: 'ax' })
//   stream.write(`
// -- +goose Up
// -- THIS FILE IS GENERATED BY \`pnpm gen-weekly-golds-sql\` IN /STATE
// -- SQL in this section is executed when the migration is applied.

// TRUNCATE weekly_golds;

// ${inserts.reduce((res, cur) => res + '\n' + cur)}`)

//   stream.end()

//   console.log('[generated] ', targetFile)
// }

// main()
