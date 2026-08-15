import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const structFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const exactStruct = (source, name, expected) =>
  JSON.stringify(structFields(structBody(source, name))) ===
  JSON.stringify(expected)

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const field = (name, type, json, omitEmpty = false) => ({
  name,
  type,
  json,
  omitEmpty
})

const notificationEnumNames = source => {
  const block = source.match(
    /type NotificationType uint\s+const \(([\s\S]*?)\n\)/
  )?.[1]
  return block
    ? [...block.matchAll(/^\s*NotificationType_(\w+)\s+/gm)].map(
        match => match[1]
      )
    : []
}

export const notificationWireErrors = (
  generatedSource,
  rpcSource,
  dataSource,
  notificationWire,
  api,
  packageSource
) => {
  const errors = []
  const contracts = [
    [
      'Notification',
      [
        field('ID', 'uint64', 'id'),
        field('AccountID', 'AccountID', '-'),
        field('Type', '*NotificationType', 'type'),
        field('Data', '*NotificationData', '-'),
        field('CreatedAt', '*time.Time', '-'),
        field('SeenAt', '*time.Time', '-'),
        field('ValidFrom', '*time.Time', '-'),
        field('ExpiresAt', '*time.Time', '-'),
        field('PushEnabled', 'bool', '-'),
        field('PushedAt', '*time.Time', '-'),
        field(
          'LeaderboardReward',
          '*NotificationLeaderboardReward',
          'leaderboardReward',
          true
        ),
        field(
          'ConquestV2Reward',
          '*NotificationConquestV2Reward',
          'conquestV2Reward',
          true
        ),
        field('OneTime', '*NotificationOneTimeWrapper', 'oneTime', true),
        field('SeasonStart', '*NotificationSeasonStart', 'seasonStart', true)
      ]
    ],
    [
      'NotificationEarnedRank',
      [
        field('PlayerRank', '*PlayerRank', 'playerRank'),
        field('PlayerRankStage', '*PlayerRankStage', 'playerRankStage')
      ]
    ],
    [
      'NotificationLeaderboardReward',
      [
        field('Season', 'uint16', 'season'),
        field('Week', 'uint8', 'week'),
        field('SilverCardAmounts', 'map[uint64]uint64', 'silverCardAmounts'),
        field('TicketAmount', 'uint64', 'ticketAmount'),
        field(
          'EarnedConstructedPlayerRanks',
          '[]*NotificationEarnedRank',
          'earnedConstructedPlayerRanks'
        ),
        field(
          'EarnedDiscoveryPlayerRanks',
          '[]*NotificationEarnedRank',
          'earnedDiscoveryPlayerRanks'
        ),
        field('RankedConstructedRank', 'int', 'rankedConstructedRank'),
        field('RankedDiscoveryRank', 'int', 'rankedDiscoveryRank')
      ]
    ],
    [
      'NotificationConquestV2Reward',
      [
        field('Season', 'uint16', 'season'),
        field('Week', 'uint16', 'week'),
        field('TreasureLevel', 'uint16', 'treasureLevel'),
        field('AmountUSDC', 'float32', 'amountUSDC'),
        field('SilverCardAmounts', 'map[uint64]uint64', 'silverCardAmounts')
      ]
    ],
    [
      'NotificationOneTimeWrapper',
      [
        field('ID', 'uint64', 'id'),
        field('Name', 'string', 'name'),
        field('Data', '*NotificationOneTimeData', 'data', true)
      ]
    ],
    [
      'NotificationOneTime',
      [
        field('ID', 'uint64', 'id'),
        field('Name', 'string', 'name'),
        field('Data', '*NotificationOneTimeData', 'data', true),
        field('Filter', '*NotificationOneTimeFilter', 'filter', true),
        field('CreatedAt', '*time.Time', 'createdAt'),
        field('ValidFrom', '*time.Time', 'validFrom', true),
        field('ExpiresAt', '*time.Time', 'expiresAt', true),
        field('UpdatedAt', '*time.Time', 'updatedAt'),
        field('UpdatedBy', '*AccountID', 'updatedBy')
      ]
    ],
    [
      'NotificationSeasonStart',
      [
        field('SeasonNumber', 'uint16', 'seasonNumber'),
        field('SeasonName', 'string', 'seasonName')
      ]
    ]
  ]
  for (const [name, expected] of contracts) {
    if (!exactStruct(generatedSource, name, expected)) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }

  const expectedTypes = [
    'LEADERBOARD_REWARD',
    'CONQUEST_V2_REWARD',
    'ONE_TIME',
    'SKYPASS_LEVEL_INTRODUCTION',
    'SEASON_START'
  ]
  if (
    JSON.stringify(notificationEnumNames(generatedSource)) !==
    JSON.stringify(expectedTypes)
  ) {
    errors.push('source NotificationType enum changed')
  }

  for (const token of [
    'var response []*proto.Notification',
    'response = append(response, notification.Notification)',
    'var notificationsProto []*proto.NotificationOneTime',
    'notificationsProto = append(notificationsProto, notification.NotificationOneTime)'
  ]) {
    if (!rpcSource.includes(token)) {
      errors.push(`source notification nil/list construction changed: ${token}`)
    }
  }
  for (const token of [
    'case proto.NotificationType_LEADERBOARD_REWARD:',
    'field `LeaderboardReward` cannot be nil',
    'case proto.NotificationType_CONQUEST_V2_REWARD:',
    'field `ConquestV2Reward` cannot be nil',
    'case proto.NotificationType_ONE_TIME:',
    'field `OneTime` cannot be nil',
    'case proto.NotificationType_SKYPASS_LEVEL_INTRODUCTION:',
    'case proto.NotificationType_SEASON_START:',
    'field `SeasonStart` cannot be nil'
  ]) {
    if (!dataSource.includes(token)) {
      errors.push(`source notification union validation changed: ${token}`)
    }
  }

  const compactWire = notificationWire.replace(/\s+/g, ' ')
  for (const token of [
    'type: notification.type ?? null',
    "case 'LEADERBOARD_REWARD':",
    "case 'CONQUEST_V2_REWARD':",
    "case 'ONE_TIME':",
    "case 'SEASON_START':",
    'playerRank: rank.playerRank ?? null',
    'playerRankStage: rank.playerRankStage ?? null',
    'ranks == null ? null : ranks.map(sourceEarnedRankWire)',
    'silverCardAmounts: reward.silverCardAmounts ?? null',
    'notification.data == null ? {} : { data: notification.data }',
    'createdAt: notification.createdAt ?? null',
    'updatedAt: notification.updatedAt ?? null',
    'updatedBy: notification.updatedBy ?? null',
    'notifications.length ? notifications.map(sourceNotificationWire) : null',
    'notifications.length ? notifications.map(sourceNotificationOneTimeWire) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker notification wire is missing: ${token}`)
    }
  }

  if (!api.includes("from './notification-wire'")) {
    errors.push('main Worker lost the shared notification wire import')
  }
  const routeChecks = [
    [
      'GMListOneTimeNotifications',
      "case 'GMCreateOneTimeNotification':",
      'sourceNullableNotificationOneTimeListWire('
    ],
    [
      'GMCreateOneTimeNotification',
      "case 'GMUpdateOneTimeNotification':",
      'sourceNotificationOneTimeWire('
    ],
    [
      'GMUpdateOneTimeNotification',
      "case 'GMDeleteOneTimeNotification':",
      'sourceNotificationOneTimeWire('
    ],
    [
      'ListNotifications',
      "case 'SetNotificationsAsSeen':",
      'sourceNullableNotificationListWire('
    ]
  ]
  for (const [route, end, token] of routeChecks) {
    if (!section(api, `case '${route}':`, end).includes(token)) {
      errors.push(
        `${route} bypasses source notification response normalization`
      )
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:notification-wire'] !==
    'node --test ./utils/check-cloudflare-notification-wire.test.mjs && node ./utils/check-cloudflare-notification-wire.mjs'
  ) {
    errors.push('package scripts lost the notification wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:notification-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the notification wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/notifications.go',
    'api/data/notification.go',
    'cloudflare/src/notification-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = notificationWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Notification enum, union variants, nested rewards, templates, and nil lists preserve generated Go JSON semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
