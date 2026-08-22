import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// LevelProgress is the source boundary for every season-scoped account level:
// achieved account level minus the immutable account level at first season
// participation. New source consumers must receive an explicit Cloudflare
// projection before the complete release contract can pass.
export const REVIEWED_SOURCE_LEVEL_PROGRESS_CALLS = {
  'api/rpc/accounts.go': 1,
  'api/lib/quests/reward_applier.go': 2,
  'api/lib/levels/xp/awarder.go': 4,
  'api/lib/skypass/lister.go': 2,
  'api/lib/rankup/match_player_rank_upper.go': 1
}

const contract = (evidenceFiles, evidence) => ({ evidenceFiles, evidence })

export const REVIEWED_SEASON_PROGRESS_CONTRACTS = {
  'source-achieved-minus-initial': contract(
    ['api/data/skypass_season_stat.go'],
    ['return s.AchievedAccountLevel - s.InitialAccountLevel']
  ),
  'account-season-level': contract(
    [
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/player.ts',
      'cloudflare/src/experience-publication.ts',
      'match-service-cloudflare/src/repository.ts',
      'cloudflare/test/player-rpc.test.ts',
      'match-service-cloudflare/test-cloudflare/worker.test.ts'
    ],
    [
      'effectiveSkypassSeasonLevel(',
      'publishedSeasonInitialLevelSQL(',
      'publishedSeasonAchievedLevelSQL(',
      'sourceVisibleSeasonProgress(',
      'visibleSeason.initial,',
      'visibleSeason.achieved',
      ').toMatchObject({ seasonLevel: 0 })',
      'seasonLevel: 0'
    ]
  ),
  'match-experience-level': contract(
    [
      'game-server-cloudflare/src/experience.ts',
      'game-server-cloudflare/src/progression.ts',
      'game-server-cloudflare/test-cloudflare/game-match.test.ts'
    ],
    [
      'currentLevel: player.seasonLevel',
      'season_stats.achieved_account_level',
      '- season_stats.initial_account_level',
      "reason: 'MatchPlayed', currentLevel: 0",
      "reason: 'Victory', currentLevel: 0"
    ]
  ),
  'tutorial-experience-level': contract(
    [
      'cloudflare/src/bot-match.ts',
      'cloudflare/src/experience-publication.ts',
      'cloudflare/test/bot-match-rpc.test.ts'
    ],
    [
      'publishedSeasonInitialLevelSQL(',
      'publishedSeasonAchievedLevelSQL(',
      'sourceVisibleSeasonProgress(',
      'visibleSeason.achieved - visibleSeason.initial',
      'currentLevel: visibleSeasonLevel',
      "reason: 'TutorialCompleted'",
      'currentLevel: 0'
    ]
  ),
  'rank-up-experience-level': contract(
    [
      'game-server-cloudflare/src/progression.ts',
      'game-server-cloudflare/test-cloudflare/game-match.test.ts'
    ],
    [
      'skypass.achieved_account_level',
      '- skypass.initial_account_level',
      'seasonLevel: stats.season_level',
      "reason: 'RankUp'",
      'currentLevel: 0'
    ]
  ),
  'quest-experience-level': contract(
    [
      'cloudflare/src/player-rpc.ts',
      'cloudflare/migrations/0108_quest_reward_season_progress.sql',
      'cloudflare/test/player-rpc.test.ts'
    ],
    [
      'season_initial_account_level',
      'season_achieved_account_level_before',
      'effectiveSkypassSeasonLevel(',
      'reports quest XP relative to the immutable source season baseline',
      'currentLevel: 2'
    ]
  ),
  'skypass-listing-progress': contract(
    ['cloudflare/src/player-rpc.ts', 'cloudflare/test/player-rpc.test.ts'],
    [
      'const progress = effectiveSkypassSeasonLevel(',
      'progress + 1',
      'earned: level <= progress',
      'materializes exact infinite SkyPass rewards through progress plus one'
    ]
  )
}

const FORBIDDEN_DESTINATION_PROJECTIONS = [
  {
    pattern: /currentLevel\s*:\s*(?:receipt\.)?after_level\b/,
    label: 'quest lifetime after_level returned as currentLevel'
  },
  {
    pattern: /['"]currentLevel['"]\s*,\s*(?:receipt\.)?after_level\b/,
    label: 'stored quest lifetime after_level returned as currentLevel'
  },
  {
    pattern: /currentLevel\s*:\s*(?:profile|row|player|stats)\.level\b/,
    label: 'lifetime account level returned as currentLevel'
  },
  {
    pattern: /seasonLevel\s*:\s*(?:profile|row|player|stats)\.level\b/,
    label: 'lifetime account level returned as seasonLevel'
  }
]

export const extractLevelProgressCallCounts = sources => {
  const counts = {}
  for (const [file, source] of Object.entries(sources)) {
    const count = [...source.matchAll(/\.LevelProgress\(\)/g)].length
    if (count > 0) counts[file] = count
  }
  return counts
}

export const seasonProgressAuditErrors = ({
  sourceFiles,
  evidenceSources,
  destinationSource,
  reviewedSourceCalls = REVIEWED_SOURCE_LEVEL_PROGRESS_CALLS,
  reviewedContracts = REVIEWED_SEASON_PROGRESS_CONTRACTS
}) => {
  const errors = []
  const actualCalls = extractLevelProgressCallCounts(sourceFiles)

  for (const [file, count] of Object.entries(actualCalls)) {
    if (!(file in reviewedSourceCalls)) {
      errors.push(
        `unreviewed source LevelProgress consumer: ${file} (${count})`
      )
    }
  }
  for (const [file, expectedCount] of Object.entries(reviewedSourceCalls)) {
    const actualCount = actualCalls[file] ?? 0
    if (actualCount !== expectedCount) {
      errors.push(
        `source LevelProgress call count changed: ${file} expected ${expectedCount}, found ${actualCount}`
      )
    }
  }

  for (const [name, review] of Object.entries(reviewedContracts)) {
    if (!review.evidenceFiles?.length || !review.evidence?.length) {
      errors.push(`incomplete season-progress review: ${name}`)
      continue
    }
    const evidence = evidenceSources[name] ?? ''
    for (const token of review.evidence) {
      if (!evidence.includes(token)) {
        errors.push(`${name} is missing source-level evidence: ${token}`)
      }
    }
  }

  for (const forbidden of FORBIDDEN_DESTINATION_PROJECTIONS) {
    if (forbidden.pattern.test(destinationSource)) {
      errors.push(`forbidden season-progress projection: ${forbidden.label}`)
    }
  }
  return errors
}

export const readExecutableGoSources = async root => {
  const sources = {}
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(absolute)
      } else if (
        entry.name.endsWith('.go') &&
        !entry.name.endsWith('_test.go')
      ) {
        const relative = path.relative(root, absolute).split(path.sep).join('/')
        sources[relative] = await readFile(absolute, 'utf8')
      }
    }
  }
  await visit(path.join(root, 'api'))
  return sources
}

export const readSeasonProjectionDestinationSource = async root => {
  const sources = []
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(absolute)
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        sources.push(await readFile(absolute, 'utf8'))
      }
    }
  }
  for (const directory of [
    'cloudflare/src',
    'game-server-cloudflare/src',
    'match-service-cloudflare/src',
    'matchmaker-ts/src'
  ]) {
    await visit(path.join(root, directory))
  }
  return sources.join('\n')
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sourceFiles = await readExecutableGoSources(root)
  const evidenceSources = Object.fromEntries(
    await Promise.all(
      Object.entries(REVIEWED_SEASON_PROGRESS_CONTRACTS).map(
        async ([name, review]) => [
          name,
          (
            await Promise.all(
              review.evidenceFiles.map(file =>
                readFile(path.join(root, file), 'utf8')
              )
            )
          ).join('\n')
        ]
      )
    )
  )
  const destinationSource = await readSeasonProjectionDestinationSource(root)
  const errors = seasonProgressAuditErrors({
    sourceFiles,
    evidenceSources,
    destinationSource
  })
  if (errors.length) {
    for (const error of errors) {
      process.stderr.write(`Season progress audit: ${error}\n`)
    }
    process.exitCode = 1
    return
  }
  const sourceCallCount = Object.values(
    REVIEWED_SOURCE_LEVEL_PROGRESS_CALLS
  ).reduce((total, count) => total + count, 0)
  process.stdout.write(
    `All ${sourceCallCount} source LevelProgress consumers and ${Object.keys(REVIEWED_SEASON_PROGRESS_CONTRACTS).length} Cloudflare projection contracts have fail-closed evidence\n`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
