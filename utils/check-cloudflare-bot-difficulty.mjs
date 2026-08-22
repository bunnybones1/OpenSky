import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const bodyBetween = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const requireOrdered = (errors, label, source, tokens) => {
  let prior = -1
  for (const token of tokens) {
    const index = source.indexOf(token, prior + 1)
    if (index < 0) {
      errors.push(
        source.includes(token)
          ? `${label} order changed at: ${token}`
          : `${label} is missing: ${token}`
      )
      continue
    }
    prior = index
  }
}

export const botDifficultyErrors = value => {
  const errors = []
  const sourceDifficulty = bodyBetween(
    value.sourceBot,
    'func Difficulty(p *player.Player) float64 {',
    'func NewWithKeys('
  )
  requireOrdered(errors, 'Source bot difficulty', sourceDifficulty, [
    'if p == nil || p.Mode == proto.GameMode_WARM_UP {',
    'return 1',
    'playerLevel := math.Min(botMaxDifficultyLevel, float64(p.Account.Level))',
    'botDifficulty := botMinDifficulty + playerLevel*botDifficultyIncreasePerLevel',
    'return math.Floor(botDifficulty*100) / 100'
  ])
  for (const token of [
    's.Equal(1.0, bot.Difficulty(&player.Player{Mode: proto.GameMode_WARM_UP}))',
    's.Equal(0.34, bot.Difficulty(playerWithLevel(1)))',
    's.Equal("Mecha Gygax", bot.NameFromDifficulty(1))'
  ]) {
    if (!value.sourceBotTest.includes(token)) {
      errors.push(`Source bot difficulty regression is missing: ${token}`)
    }
  }

  const workerDifficulty = bodyBetween(
    value.workerBot,
    'export const botDifficultyForLevel = (level: number)',
    'export const createBotParticipant = ('
  )
  requireOrdered(errors, 'Worker bot difficulty', workerDifficulty, [
    'Math.floor((0.3 + Math.min(15, Math.max(0, level)) * (0.7 / 15)) * 100) / 100',
    'export const botDifficultyForPlayer = (mode: GameMode, level: number)',
    'mode === GameMode.WARM_UP ? 1 : botDifficultyForLevel(level)'
  ])
  const workerBot = bodyBetween(
    value.workerBot,
    'export const createBotParticipant = (',
    'const hexAddressBytes = (address: string)'
  )
  requireOrdered(errors, 'Worker bot participant', workerBot, [
    'const difficulty = botDifficultyForPlayer(mode, opponentLevel)',
    'name: BOT_NAMES[Math.round(difficulty * (BOT_NAMES.length - 1))]'
  ])

  const workerMatch = value.workerMatchBuilder.slice(
    value.workerMatchBuilder.indexOf('export const buildMatch = async (')
  )
  requireOrdered(errors, 'Worker match bot setting', workerMatch, [
    'const isBot = (participant: AcceptedMatchParticipant) =>',
    'participant.player.address === BOT_PLACEHOLDER ||',
    'participant.registeredBot !== undefined',
    'const botParticipant = dispatch.participants.find(isBot)',
    'botDifficulty: botDifficultyForPlayer(',
    'botParticipant.player.mode,',
    'humanLevel'
  ])

  const workerRegression = bodyBetween(
    value.workerTest,
    "it('forces the source full-strength bot for Warm Up matches'",
    "it('uses the identity inventory as the authoritative playable-card source'"
  )
  requireOrdered(errors, 'Worker Warm Up bot regression', workerRegression, [
    "accepted.proposalId = 'proposal-warm-up-difficulty'",
    'accepted.participants[0].player.mode = GameMode.WARM_UP',
    'accepted.participants[0].request!.mode = GameMode.WARM_UP',
    'accepted.participants[1].player.mode = GameMode.WARM_UP',
    "account: { name: 'Mecha Gygax' }",
    'matchSettings: { botDifficulty: 1 }'
  ])

  const scripts = value.rootPackage?.scripts ?? {}
  if (
    scripts['check:cloudflare:bot-difficulty'] !==
    'node --test ./utils/check-cloudflare-bot-difficulty.test.mjs && node ./utils/check-cloudflare-bot-difficulty.mjs'
  ) {
    errors.push('Bot-difficulty source gate command is incomplete')
  }
  for (const [script, label] of [
    ['build:cloudflare', 'Complete Cloudflare build'],
    ['deploy:cloudflare:match-service', 'Match-service deployment']
  ]) {
    if (
      !String(scripts[script] ?? '').includes(
        'pnpm check:cloudflare:bot-difficulty'
      )
    ) {
      errors.push(`${label} omits the bot-difficulty source gate`)
    }
  }
  if (
    !value.ciAudit.includes(
      "build.includes('pnpm check:cloudflare:bot-difficulty')"
    )
  ) {
    errors.push('CI audit does not require the bot-difficulty source gate')
  }
  if (
    !value.ciAuditTest.includes("'pnpm check:cloudflare:bot-difficulty && '")
  ) {
    errors.push('CI audit lacks a bot-difficulty gate removal regression')
  }
  return errors
}

const readSources = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
  const [
    sourceBot,
    sourceBotTest,
    workerBot,
    workerMatchBuilder,
    workerTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    read('matchmaker/lib/player/bot/bot.go'),
    read('matchmaker/lib/player/bot/bot_test.go'),
    read('match-service-cloudflare/src/bot.ts'),
    read('match-service-cloudflare/src/match-builder.ts'),
    read('match-service-cloudflare/test-cloudflare/worker.test.ts'),
    read('package.json').then(JSON.parse),
    read('utils/audit-cloudflare-ci.mjs'),
    read('utils/audit-cloudflare-ci.test.mjs')
  ])
  return {
    sourceBot,
    sourceBotTest,
    workerBot,
    workerMatchBuilder,
    workerTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = botDifficultyErrors(await readSources(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare Warm Up bots preserve the source full-strength difficulty while other bot modes retain the level curve'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
