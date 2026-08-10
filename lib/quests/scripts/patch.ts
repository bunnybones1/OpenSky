import { Hero, QuestPeriodicity } from '@opensky/proto'
import { sortedStringify } from '@opensky/shared/utils/sort-keys'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import { downloadSheets } from '@opensky/tools/googleSheets'
import { exec } from 'child_process'
import * as fs from 'fs'
import { parse } from 'papaparse'
import * as path from 'path'
import * as readline from 'readline'
// edit me! useful things to change
const sheetsID = '10ARH50lhv8mKTKDlGidcjv8oliLT7dd6ryDsR0iNyhk'
const baseFolder = path.join(__dirname, '..')
const sheetFolder = path.join(baseFolder, 'sheet_imported')
const srcFolder = path.join(baseFolder, 'src')

const dailyCSVPath = path.join(sheetFolder, 'daily.csv')
const weeklyCSVPath = path.join(sheetFolder, 'weekly.csv')
const seasonalCSVPath = path.join(sheetFolder, 'seasonal.csv')
const designJSONPath = path.join(sheetFolder, 'design.json')
const devJSONPath = path.join(sheetFolder, 'dev.json')
const prodJSONPath = path.join(sheetFolder, 'prod.json')
const idMemoryJSONPath = path.join(sheetFolder, 'id_memory.json')
const ridlPath = path.join(sheetFolder, 'quests.ridl')
const libraryPath = path.join(srcFolder, 'library.ts')
const enLangJSONPath = path.join(baseFolder, 'locales/en/quests.json')
const migrationsDir = path.resolve(
  __dirname,
  '../../../api/data/schema/migrations/'
)

// command line options
const options = [
  'download',
  'start',
  'status',
  'no',
  'quest',
  'mark',
  'finish',
  'exit'
]
void main()
async function main() {
  const passedArgs = process.argv.slice(2).map(a => a.trim())
  if (passedArgs.length > 0) {
    await run(passedArgs)
  } else {
    console.log(`
    ╔═╗┬┌─┬ ┬┬ ┬┌─┐┌─┐┬  ┬┌─┐┬─┐  ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐┌─┐
    ╚═╗├┴┐└┬┘│││├┤ ├─┤└┐┌┘├┤ ├┬┘  ║═╬╗│ │├┤ └─┐ │ └─┐
    ╚═╝┴ ┴ ┴ └┴┘└─┘┴ ┴ └┘ └─┘┴└─  ╚═╝╚└─┘└─┘└─┘ ┴ └─┘
    interactive patcher - https://docs.google.com/spreadsheets/d/${sheetsID}/edit
    -------------------------------------------------
`)
    let command: string[] = ['']
    while (command.length > 0) {
      console.log(`options: ${options.join(', ')}`)
      const next = await askQuestion('>>> ')
      command = next.split(' ')
      await run(command)
    }
  }
}

async function run(args: string[]) {
  const [arg, ...rest] = args
  if (arg === 'start') {
    await startPatch()
  } else if (arg === 'download') {
    await downloadPatch()
  } else if (arg === 'status' || arg === 's') {
    patchStatus()
  } else if (arg === 'mark' || arg === 'm') {
    markQuest(...rest)
  } else if (arg === 'quest' || arg === 'q') {
    showQuest(...rest)
  } else if (arg === 'no' || arg === 'n') {
    showNo(...rest)
  } else if (arg === 'finish') {
    await finishPatch()
  } else if (arg === 'quit' || arg === 'exit') {
    process.exit(0)
  } else {
    console.error(`usage: pnpm run patch [${options.join(' | ')}]`)
  }
}

async function downloadPatch() {
  const main =
    (await askQuestion('Update quests sheet? [y/N]: ')).toLowerCase() === 'y'
  const downloadTestQuests =
    (await askQuestion('Update test quests sheet? [y/N]: ')).toLowerCase() ===
    'y'
  if (!main) {
    return
  }

  const existing = JSON.parse(
    fs.readFileSync(designJSONPath).toString()
  ) as QuestsJson

  if (!fs.existsSync(idMemoryJSONPath)) {
    fs.writeFileSync(
      idMemoryJSONPath,
      JSON.stringify({
        epicIDs: [],
        questIDs: []
      } as IDMemoryJSON)
    )
  }

  const idMemory = JSON.parse(
    fs.readFileSync(idMemoryJSONPath, 'utf8').toString()
  ) as IDMemoryJSON

  const { daily, weekly, seasonal, test } = await downloadSheets(sheetsID, {
    daily: 'Daily',
    weekly: 'Weekly',
    seasonal: 'Seasonal',
    ...(downloadTestQuests ? { test: 'testQuests' } : {})
  })

  const newQuests = [
    ...parseQuestsSheet(daily, QuestPeriodicity.DAILY, idMemory),
    ...parseQuestsSheet(weekly, QuestPeriodicity.WEEKLY, idMemory),
    ...parseQuestsSheet(seasonal, QuestPeriodicity.SEASONAL, idMemory),
    ...(test
      ? parseQuestsSheet(test, QuestPeriodicity.UNKNOWN, idMemory)
      : existing.filter(q => q.periodicity === QuestPeriodicity.UNKNOWN))
  ]
  for (let i = 0; i < newQuests.length; i++) {
    if (newQuests.findIndex(q => q.id === newQuests[i].id) !== i) {
      throw new Error(`Duplicate Quest ID ${newQuests[i].id}`)
    }
  }

  const epics = new Map<number, number[]>()
  for (let i = 0; i < newQuests.length; i++) {
    const q = newQuests[i]
    if (q.epicIndex && q.epic) {
      const epic =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        epics.get(q.epic) ?? (epics.set(q.epic, []), epics.get(q.epic)!)
      epic.push(q.epicIndex)
    }
  }
  // assert epic indexes are increasing by 1
  for (const [epic, indicies] of epics) {
    const x = [indicies[0]]
    if (!x[0]) {
      throw new Error(
        `Invalid epic ${nameOfEpic(epic)} - indexes ${JSON.stringify(
          indicies
        )} are bad`
      )
    }
    for (const i of indicies.slice(1)) {
      if (i !== x[x.length - 1] + 1) {
        throw new Error(
          `Invalid epic ${nameOfEpic(epic)} - indexes ${JSON.stringify(
            indicies
          )} don't monotonically increase`
        )
      }
      x.push(i)
    }
  }

  fs.writeFileSync(designJSONPath, JSON.stringify(newQuests))
  fs.writeFileSync(idMemoryJSONPath, JSON.stringify(idMemory))

  fs.writeFileSync(dailyCSVPath, daily)
  fs.writeFileSync(weeklyCSVPath, weekly)
  fs.writeFileSync(seasonalCSVPath, seasonal)

  console.log('done.')
}

async function startPatch() {
  const ans = await askQuestion('Are you sure you want to patch? [y/N]: ')
  if (ans.toLowerCase() !== 'y') {
    return
  }
  console.log('Okay! Starting a new patch.')
  console.log('------------------------------')

  const designSheet = JSON.parse(
    fs.readFileSync(designJSONPath, 'utf8').toString()
  ) as QuestsJson

  const prodSheet = JSON.parse(
    fs.readFileSync(prodJSONPath, 'utf8').toString()
  ) as QuestsJson

  console.log('Generating diff between prod.json and design.json...')
  const prodDuplicateCheck =
    new Set(prodSheet.map(c => c.id)).size === prodSheet.length
  if (!prodDuplicateCheck) {
    console.error(
      `Couldn't finish patch: there are duplicate quest IDs in prod.json`
    )
    process.exit(1)
  }
  console.log('Generating dev.json...')

  const diff = generateDiff(prodSheet, designSheet)
  const quests = [
    ...diff.unchanged.map(c => {
      return { ...c, status: 'ready' as const }
    }),
    ...diff.changed.map(c => ({
      ...c.new,
      status:
        c.old.description !== c.new.description
          ? ('update' as const)
          : ('ready' as const)
    })),
    ...diff.added.map(c => ({
      ...c,
      status: 'add' as const
    }))
  ]
  if (diff.removed.length) {
    console.log('Removed Quests:', diff.removed)
    process.exit(1)
  }
  const devJSON: MidPatchQuestSheetJson = {
    quests,
    modifiedQuests: quests
      .filter(q => q.status === 'update' || q.status === 'add')
      .map(q => q.numericalID)
  }

  fs.writeFileSync(devJSONPath, JSON.stringify(devJSON, null, 2))

  console.log('------------------------------')
  console.log('Generating RIDL...')
  writeRidl(designSheet)
  console.log('Generating quests library...')
  writeLibrary(designSheet)
  console.log('Generating quests lang json...')
  writeLangJSON(designSheet)
  console.log('Generating quests SQL...')
  writeLibrarySQL(designSheet)
  console.log('Making API proto...')
  await new Promise<void>((res, rej) => {
    exec(
      'make proto',
      { cwd: path.join(__dirname, '../../../api') },
      (err, stdout, stderr) => {
        if (err) {
          rej(err)
        }
        if (stderr) {
          rej(new Error(stderr))
        }
        console.log(stdout)
        res()
      }
    )
  })
  console.log('Rebuilding API proto...')
  console.log('Done!')
  console.log('run `pnpm run patch status` to see what work needs to be done.')
}

async function finishPatch() {
  try {
    const devSheet = JSON.parse(
      fs.readFileSync(devJSONPath).toString()
    ) as MidPatchQuestSheetJson

    for (const quest of devSheet.quests) {
      if (quest.status === 'update' || quest.status === 'add') {
        console.error(
          `Couldn't finish quests patch: quest ${quest.numericalID} ${quest.id} ${quest.name} is still marked 'update'.`
        )
        console.log(`Run \`pnpm run patch status\` for more information.`)
        return
      }
    }
    console.log('Finishing patch...')
    const ans = await askQuestion(
      'Okay to overwrite prod.json and delete dev.json? [y/N]'
    )
    if (ans.toLowerCase() === 'y') {
      const finishedDevSheetQuests: QuestsJsonQuest[] = devSheet.quests
        .filter(c => c.status === 'ready')
        .map(c => {
          delete c.status
          return c
        })

      finishedDevSheetQuests.sort((a, b) => a.numericalID - b.numericalID)

      const newProdSheet: QuestsJson = finishedDevSheetQuests
      fs.writeFileSync(prodJSONPath, JSON.stringify(newProdSheet, null, 2))
      fs.unlinkSync(devJSONPath)
    } else {
      console.log('Aborting.')
    }
  } catch (err) {
    console.error('No patch in progress!', err)
  }
}

function patchStatus() {
  try {
    const devSheet = JSON.parse(
      fs.readFileSync(devJSONPath).toString()
    ) as MidPatchQuestSheetJson
    const workon: (QuestsJsonQuest & {
      status?: PatchQuestStatus
    })[] = []
    const ready: QuestsJsonQuest[] = []
    const readyWorkedOn: QuestsJsonQuest[] = []
    for (const quest of devSheet.quests) {
      switch (quest.status) {
        case 'ready':
          ready.push(quest)
          if (devSheet.modifiedQuests.includes(quest.numericalID)) {
            readyWorkedOn.push(quest)
          }
          break
        case 'update':
        case 'add':
          workon.push(quest)
          break
      }
    }
    console.log('==========================')
    console.log('Patch status:')
    console.log(
      `${ready.length} / ${ready.length + workon.length} quests ready.`
    )
    console.log(`Done this patch: [${readyWorkedOn.map(c => c.id).join(',')}]`)
    console.log(`${workon.length} quests to-do.`)
    const add = workon
      .filter(c => c.status === 'add')
      .reduce<{ [index: number]: { id: string; name: string } }>((obj, c) => {
        obj[c.numericalID] = { id: c.id, name: c.name }
        return obj
      }, {})
    if (Object.keys(add).length > 0) {
      console.log('Add: ')
      console.table(add)
    }
    const update = workon
      .filter(c => c.status === 'update')
      .reduce<{ [index: number]: string }>((obj, c) => {
        obj[c.numericalID] = c.name
        return obj
      }, {})
    if (Object.keys(update).length > 0) {
      console.log('Update: ')
      console.table(update)
    }

    if (workon.length === 0) {
      console.log('Patch is ready! run `pnpm run patch finish`.')
    }
  } catch (err) {
    console.error('No patch in progress!')
  }
}

function markQuest(...args: string[]) {
  try {
    const logUsage = () =>
      console.log(
        'pnpm run patch mark <numeric or string id> [more ids] <(d)one | (u)pdate | (a)dd> | (n)o'
      )
    const devSheet = JSON.parse(
      fs.readFileSync(devJSONPath).toString()
    ) as MidPatchQuestSheetJson
    if (args.length < 2) {
      logUsage()
      return
    }
    const mode = args[args.length - 1]
    for (const idString of args.slice(0, args.length - 1)) {
      const numId = Number.parseInt(idString, 10)
      let id: number | undefined = numId
      if (Number.isNaN(numId)) {
        id = devSheet.quests.find(c => c.id === idString)?.numericalID
      }
      if (id === undefined || !devSheet.modifiedQuests.includes(id)) {
        console.log(`Quest [${idString}] isn't in this patch.`)
        return
      }
      const quest = devSheet.quests.find(c => c.numericalID === id)
      if (!quest) {
        throw new Error(`Quest [${idString}] missing...`)
      }
      switch (mode[0].toLowerCase()) {
        case 'd': // done
          quest.status = 'ready'
          break
        case 'u': // update
          quest.status = 'update'
          break
        case 'a': // add
          quest.status = 'add'
          break
        case 'n': // no
          quest.status = 'no'
          break
        default:
          logUsage()
          return
      }
      console.log(`Marked [${quest.id}] ${quest.name} as ${quest.status}`)
    }
    // write updated dev sheet
    fs.writeFileSync(devJSONPath, JSON.stringify(devSheet, null, 2))
  } catch (err) {
    console.error('No patch in progress!')
  }
}

function showQuest(...args: string[]) {
  console.log(
    '================================================================'
  )
  const logUsage = () => console.log('pnpm run patch quest [id]')
  const devSheet = JSON.parse(
    fs.readFileSync(devJSONPath).toString()
  ) as MidPatchQuestSheetJson
  if (args.length !== 1) {
    logUsage()
    return
  }
  const numId = Number.parseInt(args[0].trim())
  let id: number | undefined = numId
  if (Number.isNaN(numId)) {
    id = devSheet.quests.find(
      c => c.id.toLowerCase() === args[0].trim().toLowerCase()
    )?.numericalID
  }
  if (id === undefined || !devSheet.modifiedQuests.includes(id)) {
    console.log(`Quest [${args[0].trim()}] isn't in this patch.`)
    return
  }

  const prodSheet = JSON.parse(
    fs.readFileSync(prodJSONPath, 'utf8').toString()
  ) as QuestsJson

  const diff = generateDiff(
    prodSheet,
    devSheet.quests.map(c => {
      delete c.status
      return c
    })
  )
  const added = diff.added.find(c => c.numericalID === id)
  if (added) {
    console.log('NEW QUEST:')
    printQuest(added)
  } else {
    const changed = diff.changed.find(c => c.new.numericalID === id)
    if (changed) {
      console.log('MODIFIED QUEST:')
      printDiff(changed.old, changed.new)
    } else {
      const unchanged = diff.unchanged.find(c => c.numericalID === id)
      if (unchanged) {
        console.log('UNCHANGED QUEST:')
        printQuest(unchanged)
      } else {
        const removed = diff.removed.find(c => c.numericalID === id)
        if (removed) {
          console.log(`Quest ${id} was removed!`)
        } else {
          console.error(`Quest ${id} doesn't exist.`)
        }
      }
    }
  }
}

function showNo(...args: string[]) {
  console.log(
    '================================================================'
  )
  const logUsage = () => console.log('pnpm run patch no')
  const devSheet = JSON.parse(
    fs.readFileSync(devJSONPath).toString()
  ) as MidPatchQuestSheetJson
  if (args.length !== 0) {
    logUsage()
    return
  }
  const qs = devSheet.quests.filter(c => c.status === 'no')
  for (const q of qs) {
    console.log(`${q.name}: ${q.description}`)
  }
}

function printQuest(quest: QuestsJsonQuest) {
  console.log(renderQuest(quest))
}

function renderQuest(quest: QuestsJsonQuest, title = ''): string {
  const questWidth = 40
  return (
    title +
    '\n' +
    questText('_'.repeat(questWidth), ' ', ' ') +
    questText(' '.repeat(questWidth), '/', '\\') +
    questText(`[${quest.numericalID}] (${quest.id})
${quest.name}
[${quest.periodicity as string}] [column ${quest.column}] ${
      quest.rerollable ? '[Rerollable]' : '[NOT Rerollable]'
    }
${quest.epic ? `Epic: ${quest.epic}` : ''}
Reward: ${quest.rewardXp} XP
${quest.startProgress}/${quest.endProgress}
${
  quest.requiredCards.length
    ? `Required Cards: ${quest.requiredCards.join(',')}\n`
    : ''
}${
      quest.requiredHero !== null
        ? `Required Hero: ${quest.requiredHero}\n`
        : ''
    }${
      quest.requiredMinLevel || quest.requiredMaxLevel
        ? `Required Level: ${quest.requiredMinLevel ?? 0}-${
            quest.requiredMaxLevel ?? 'Infinity'
          }\n`
        : ''
    }

${wrap(quest.description, questWidth)}`) +
    questText('_'.repeat(questWidth), '\\', '/')
  )

  function questText(text: string, left = '|', right = '|'): string {
    return (
      text
        .split('\n')
        .map(line => {
          const width = Math.max(0, questWidth - line.length)
          const padding = ' '.repeat(Math.floor(width / 2))
          return (
            left +
            padding +
            line +
            (width % 2 == 0 ? padding : padding + ' ') +
            right
          )
        })
        .join('\n') + '\n'
    )
  }
}

function wrap(string: string, width: number): string {
  return string.replace(
    new RegExp(`(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`, 'g'),
    '$1\n'
  )
}

function printDiff(oldQuest: QuestsJsonQuest, newQuest: QuestsJsonQuest) {
  console.log(
    renderQuest(oldQuest, 'Old Quest') +
      '\n' +
      renderQuest(newQuest, 'New Quest')
  )
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve =>
    rl.question(query, (ans: string) => {
      rl.close()
      resolve(ans)
    })
  )
}

interface QuestsJsonQuest {
  numericalID: number
  id: string
  periodicity: QuestPeriodicity
  rerollable: boolean
  epic?: (typeof Epic)[keyof typeof Epic]
  epicIndex?: number
  artID: string
  name: string
  description: string
  column: number
  startProgress: number
  endProgress: number
  requiredHero: Hero | null
  requiredCards: BaseCard[]
  requiredMinLevel: number | null
  requiredMaxLevel: number | null
  rewardXp: number
}

type QuestsJson = QuestsJsonQuest[]
type IDMemoryJSON = { questIDs: string[]; epicIDs: string[] }

export type PatchQuestStatus = 'update' | 'ready' | 'add' | 'no'
export interface MidPatchQuestSheetJson {
  quests: (QuestsJsonQuest & { status?: PatchQuestStatus })[]
  modifiedQuests: number[]
}

function parseQuestsSheet(
  sheet: string,
  periodicity: QuestPeriodicity,
  idMemory: IDMemoryJSON
): QuestsJsonQuest[] {
  const parsed = parse(sheet.replace(/\r/g, ''), {
    dynamicTyping: false,
    newline: ',',
    header: true
  })
  const expectedFields = [
    'ID',
    'Rerollable',
    'Epic',
    'Chain',
    'Art',
    'Art ID',
    'Name',
    'Description',
    'Difficulty',
    'Column',
    'StartProgress',
    'EndProgress',
    'RQ Hero',
    'RQ Card',
    'RQ Min Lv',
    'RQ Max Lv',
    'XP Amount',
    'Chars',
    'Ready'
  ]
  expectedFields.forEach((val, index) => {
    if (parsed.meta.fields[index] !== val) {
      throw new Error(
        `Expected field ${val} at index ${index}, got ${parsed.meta.fields[index]}`
      )
    }
  })

  return parse(sheet.replace(/\r/g, ''), {
    dynamicTyping: false,
    newline: ',',
    header: false
  })
    .data.slice(1)
    .filter((a: string[]) => a[0].length)
    .map((questStr: string[]) => {
      try {
        const [
          id,
          rerollable,
          epic,
          epicIndex,
          _art,
          artID,
          name,
          description,
          _difficulty,
          column,
          startProgress,
          endProgress,
          requiredHero,
          requiredCards,
          requiredMinLevel,
          requiredMaxLevel,
          xpReward,
          _chars,
          ready
        ] = questStr.map((s: string) => s.trim())
        if (ready.toLowerCase() !== 'true') {
          return
        }
        const e =
          epic.toLowerCase() in Epic
            ? (Epic[epic.toLowerCase()] as (typeof Epic)[keyof typeof Epic])
            : epic.length === 0
            ? undefined
            : (() => {
                throw new Error('Invalid epic ' + epic)
              })()
        const eIdx = epicIndex ? parseInt(epicIndex, 10) : undefined
        if (e) {
          if (!Number.isInteger(eIdx)) {
            throw new Error('Invalid Epic index ' + epicIndex)
          }
        }

        const existingIndex = idMemory.questIDs.indexOf(id)
        const numericalID =
          1 + (existingIndex === -1 ? idMemory.questIDs.length : existingIndex)

        if (existingIndex === -1) {
          idMemory.questIDs.push(id)
        }

        return {
          id,
          numericalID,
          artID,
          description,
          name,
          epic: e,
          epicIndex: eIdx,
          rerollable: rerollable.toLowerCase() === 'true',
          periodicity,
          column: parseColumn(column),
          requiredHero: parseHero(requiredHero),
          startProgress: getOptionalSmallInt(startProgress) ?? 0,
          endProgress: getOptionalSmallInt(endProgress) ?? 1,
          rewardXp: getSmallInt(xpReward),
          requiredCards: requiredCards
            .split(',')
            .map(s => s.trim())
            .filter((c): c is BaseCard => CardLibrary.has(c as BaseCard)),
          requiredMinLevel: getOptionalSmallInt(requiredMinLevel) ?? 1,
          requiredMaxLevel: getOptionalSmallInt(requiredMaxLevel)
        } satisfies QuestsJsonQuest
      } catch (err) {
        console.error('Failed to parse', questStr)
        throw err
      }
    })
    .filter(isDefined)
}

function getSmallInt(num: string): number {
  return (
    getOptionalSmallInt(num) ??
    (() => {
      throw new Error('No small int provided')
    })()
  )
}

function getOptionalSmallInt(num: string): number | null {
  const p = Number.parseInt(num.replaceAll(',', ''), 10)
  if (p > 32766 || p < 0) {
    throw new Error('Invalid smallInt ' + num)
  }
  return Number.isNaN(p) ? null : p
}

function isDefined<T>(input: T | null | undefined): input is T {
  return typeof input !== 'undefined' && input !== null
}
function parseHero(hero: string): Hero | null {
  return hero.trim().length
    ? (() => {
        const h = Hero[hero.trim().toUpperCase() as Hero]
        if (!h) {
          throw new Error(`Unknown hero: ${hero}`)
        }
        return h
      })()
    : null
}

function parseColumn(column: string): number {
  return column === 'left'
    ? 1
    : column === 'mid'
    ? 2
    : column === 'right'
    ? 3
    : (() => {
        throw new Error(`Unknown column: ${column}`)
      })()
}

export function generateDiff(
  oldQuests: QuestsJsonQuest[],
  newQuests: QuestsJsonQuest[]
): QuestsDiffJson {
  const diff: QuestsDiffJson = {
    added: newQuests.filter(c => !oldQuests.find(oldQ => oldQ.id === c.id)),
    removed: [],
    changed: [],
    unchanged: []
  }

  for (const oldQuest of oldQuests) {
    // quest exists in old & new sheet
    const newQuest = newQuests.find(c => c.id === oldQuest.id)
    if (newQuest) {
      if (newQuest.numericalID !== oldQuest.numericalID) {
        throw new Error(
          `Quest has ID ${oldQuest.id}, but numerical ID changed from ${oldQuest.numericalID} to ${newQuest.numericalID}`
        )
      }
      if (JSON.stringify(newQuest) === JSON.stringify(oldQuest)) {
        diff.unchanged.push(oldQuest)
      } else {
        diff.changed.push({ old: oldQuest, new: newQuest })
      }
    } else {
      // quest exists in old sheet, but not in new sheet.
      diff.removed.push(oldQuest)
    }
    const sameNumID = newQuests.find(
      c => c.numericalID === oldQuest.numericalID
    )
    if (sameNumID && sameNumID.id !== oldQuest.id) {
      throw new Error(
        `Quest has Numerical ID ${oldQuest.numericalID}, but string ID changed from ${oldQuest.id} to ${sameNumID.id}`
      )
    }
  }
  return diff
}

export interface QuestsDiffJson {
  added: QuestsJsonQuest[]
  removed: QuestsJsonQuest[]
  changed: Array<{
    old: QuestsJsonQuest
    new: QuestsJsonQuest
  }>
  unchanged: QuestsJsonQuest[]
}

const Epic = {
  UNKNOWN: 0,
  hero_test: 1,
  starter2_test: 2,
  starter1_test: 3,
  ff_test: 4,
  dd_test: 5,
  nav_test: 6,
  baboon_test: 7,
  wd_test: 8,
  fren_test: 9
}

function nameOfEpic(number: number): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const p = Object.entries(Epic).find(([_k, v]) => number === v)
  if (!p) {
    throw new Error(`invalid epic number ${number}`)
  }
  return p[0]
}

function writeRidl(json: QuestsJson) {
  const ridl = `
    webrpc = v1

    name = quests
    version = v0.3.0
    
    enum QuestType: uint16
      - UNKNOWN = 0
${json.map(quest => `    - ${quest.id} = ${quest.numericalID}`).join('\n')}
    
    enum EpicType: uint16
${[...Object.entries(Epic)]
  .filter(k => Number.isNaN(Number.parseInt(k[0], 10)))
  .map(([k, v]) => `    - ${k} = ${v}`)
  .join('\n')}
    `
  fs.writeFileSync(ridlPath, ridl)
}

function writeLibrary(json: QuestsJson) {
  const library = `import { QuestType } from '@opensky/proto'
import { BaseCard } from '@skyweaver/state-metadata'

export const ArtForQuests: Record<QuestType, BaseCard> = {
  UNKNOWN: '1',
${json.map(({ artID, id }) => `  ${id}: '${artID}'`).join(',\n')}
}
`
  fs.writeFileSync(libraryPath, library)
}

function writeLangJSON(json: QuestsJson) {
  const enLangJSON = sortedStringify(
    Object.fromEntries([
      ['UNKNOWN', { name: 'unknown quest ID', text: 'unknown quest ID!' }],
      ...json.map(({ name, description, id }) => [
        id,
        { name, text: description }
      ])
    ]),
    2
  )

  fs.writeFileSync(enLangJSONPath, enLangJSON)
}

const HeroLookup = {
  UNKNOWN: 0,
  ADA: 1,
  SAMYA: 2,
  FOX: 3,
  LOTUS: 4,
  TITUS: 5,
  IRIS: 6,
  BOURAN: 7,
  HORIK: 8,
  ZOEY: 9,
  AXEL: 10,
  ARI: 11,
  MIRA: 12,
  MAI: 13,
  BANJO: 14,
  SITTI: 15
}

function writeLibrarySQL(json: QuestsJson) {
  const records = json.map(
    q =>
      `(${q.numericalID}, ${q.epic ? q.epic : 'NULL'}, ${
        q.epicIndex !== undefined ? q.epicIndex : 'NULL'
      }, ${q.epic ? json.filter(qq => qq.epic === q.epic).length : 'NULL'}, ${
        q.startProgress
      }, ${q.endProgress}, '${JSON.stringify({
        itemType: 'SW_XP',
        amount: q.rewardXp
      })}', ${periodicityNumber[q.periodicity]}, ${q.column}, ${
        q.rerollable ? 'true' : 'false'
      }, ${
        q.requiredHero ? HeroLookup[q.requiredHero] : 'NULL'
      }, '[${q.requiredCards.join(',')}]', ${
        q.requiredMinLevel === null ? 'NULL' : q.requiredMinLevel
      }, ${q.requiredMaxLevel === null ? 'NULL' : q.requiredMaxLevel})`
  )
  const library = `-- +goose Up
-- THIS FILE IS GENERATED BY \`pnpm run patch\` IN /lib/quests
-- SQL in this section is executed when the migration is applied.
DELETE FROM quests_specs;
  
INSERT INTO quests_specs
(
  "quest_type",
  "epic_type",
  "epic_index",
  "epic_length",
  "start_progress",
  "end_progress",
  "reward",
  "periodicity",
  "position",
  "rerollable",
  "required_hero",
  "required_cards",
  "required_min_level",
  "required_max_level"
)
VALUES
${records.join(',\n')}
;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DELETE FROM quests_specs;
  `

  const oldMigrationsHighestID = fs
    .readdirSync(migrationsDir)
    .filter(fname => fname.includes('_') && fname.includes('.sql'))
    .reduce(
      (highest, fname) => Math.max(highest, parseInt(fname.split('_')[0], 10)),
      0
    )
  const targetFile = path.resolve(
    migrationsDir,
    `${oldMigrationsHighestID + 1}_quests_library.sql`
  )
  fs.writeFileSync(targetFile, library)
}

function parseInt(number: string, radix: number): number {
  const x = Number.parseInt(number, radix)
  if (!Number.isInteger(x)) {
    throw new Error(`Invalid number ${number} in radix ${radix}`)
  }
  return x
}
const periodicityNumber: { [K in QuestPeriodicity]: number } = {
  UNKNOWN: 0,
  DAILY: 1,
  WEEKLY: 2,
  SEASONAL: 3
}
