import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const exactStruct = (source, name, expectedFields, expectedTypes) => {
  const fields = jsonFields(structBody(source, name))
  return (
    JSON.stringify(fields.map(field => field.json)) ===
      JSON.stringify(expectedFields) &&
    JSON.stringify(fields.map(field => field.type)) ===
      JSON.stringify(expectedTypes) &&
    fields.every(field => !field.omitEmpty)
  )
}

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const questWireErrors = (
  generatedSource,
  questDataSource,
  questWire,
  api,
  packageSource
) => {
  const errors = []
  if (
    !exactStruct(
      generatedSource,
      'Quest',
      [
        'id',
        'position',
        'questType',
        'epicType',
        'epicIndex',
        'epicLength',
        'progress',
        'endProgress',
        'reward',
        'periodicity',
        'isRerollable',
        'isClaimable',
        'isClaimed',
        'isNew'
      ],
      [
        'uint64',
        'uint16',
        '*QuestType',
        '*EpicType',
        '*uint16',
        '*uint16',
        'uint16',
        'uint16',
        '*QuestReward',
        '*QuestPeriodicity',
        'bool',
        'bool',
        'bool',
        'bool'
      ]
    )
  ) {
    errors.push('source Quest JSON contract changed')
  }
  if (
    !exactStruct(
      generatedSource,
      'QuestReward',
      ['itemType', 'amount'],
      ['*ItemType', 'uint16']
    )
  ) {
    errors.push('source QuestReward JSON contract changed')
  }

  const constructor =
    section(questDataSource, 'func NewQuest(', 'return &proto.Quest{') +
    section(questDataSource, 'return &proto.Quest{', '}, nil')
  for (const token of [
    'QuestType:    &assignment.QuestType',
    'EpicType:     spec.EpicType',
    'EpicIndex:    spec.EpicIndex',
    'EpicLength:   spec.EpicLength',
    'Reward:       &spec.Reward',
    'Periodicity:  &assignment.Periodicity'
  ]) {
    if (!constructor.includes(token)) {
      errors.push(`source Quest pointer construction changed: ${token}`)
    }
  }

  const compactWire = questWire.replace(/\s+/g, ' ')
  for (const token of [
    'id: quest.id',
    'position: quest.position',
    'questType: quest.questType ?? null',
    'epicType: quest.epicType ?? null',
    'epicIndex: quest.epicIndex ?? null',
    'epicLength: quest.epicLength ?? null',
    'progress: quest.progress',
    'endProgress: quest.endProgress',
    'reward: quest.reward',
    'itemType: quest.reward.itemType ?? null',
    'amount: quest.reward.amount',
    'periodicity: quest.periodicity ?? null',
    'isRerollable: quest.isRerollable',
    'isClaimable: quest.isClaimable',
    'isClaimed: quest.isClaimed',
    'isNew: quest.isNew',
    'quests.map(sourceQuestWire)',
    'quest ? sourceQuestWire(quest) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker Quest wire is missing: ${token}`)
    }
  }

  if (!api.includes("from './quest-wire'")) {
    errors.push('main Worker lost the shared Quest wire import')
  }
  const routeChecks = [
    ['ListQuests', "case 'SetQuestsAsSeen':", 'sourceQuestListWire('],
    ['ClaimQuestRewards', "case 'ReRollQuest':", 'sourceNullableQuestWire('],
    [
      'ReRollQuest',
      "case 'GetQuestsAutoRerollTime':",
      'sourceNullableQuestWire('
    ],
    ['GetEpicQuestChain', "case 'GetCurrentSeason':", 'sourceQuestListWire(']
  ]
  for (const [route, end, token] of routeChecks) {
    if (!section(api, `case '${route}':`, end).includes(token)) {
      errors.push(`${route} bypasses source Quest response normalization`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:quest-wire'] !==
    'node --test ./utils/check-cloudflare-quest-wire.test.mjs && node ./utils/check-cloudflare-quest-wire.mjs'
  ) {
    errors.push('package scripts lost the Quest wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:quest-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the Quest wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/data/quest.go',
    'cloudflare/src/quest-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = questWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Quest and QuestReward preserve every generated Go JSON field and nullable pointer'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
