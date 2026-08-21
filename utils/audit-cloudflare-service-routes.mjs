import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const stripGoComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const stripTypeScriptComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

export const extractApiRoutes = source => {
  const code = stripGoComments(source)
  const routes = [
    ...[...code.matchAll(/middleware\.Heartbeat\("([^"]+)"\)/g)].map(
      match => `HEARTBEAT ${match[1]}`
    ),
    ...[...code.matchAll(/\br\.(Mount|Get|Handle)\("([^"]+)"/g)].map(
      match => `${match[1].toUpperCase()} ${match[2]}`
    )
  ]
  return [...new Set(routes)].sort()
}

export const extractMatchmakerRoutes = source => {
  const code = stripGoComments(source)
  const routes = [
    ...[...code.matchAll(/middleware\.Heartbeat\("([^"]+)"\)/g)].map(
      match => `HEARTBEAT ${match[1]}`
    ),
    ...[...code.matchAll(/\br\.HandleFunc\("([^"]+)"/g)].map(
      match => `HANDLE ${match[1]}`
    )
  ]
  return [...new Set(routes)].sort()
}

export const extractGameServerRoutes = source => {
  const code = stripTypeScriptComments(source)
  return [
    ...new Set(
      [...code.matchAll(/\bapp\.(get|post)\(\s*['"]([^'"]+)['"]/g)].map(
        match => `${match[1].toUpperCase()} ${match[2]}`
      )
    )
  ].sort()
}

export const EXPECTED_SOURCE_SERVICE_ROUTES = {
  api: {
    'GET /status': {
      disposition: 'superseded',
      evidenceFile: 'cloudflare/src/api.ts',
      evidence: ["case 'Ping':", "case 'Version':", 'WORKER_VERSION.id']
    },
    'HANDLE /*': {
      disposition: 'ported',
      evidenceFile: 'cloudflare/src/api.ts',
      evidence: [
        "const RPC_PREFIX = '/api/rpc/SkyWeaverAPI/'",
        'url.pathname.startsWith(RPC_PREFIX)',
        'url.pathname.slice(RPC_PREFIX.length)'
      ]
    },
    'HEARTBEAT /ping': {
      disposition: 'ported',
      evidenceFile: 'cloudflare/src/index.ts',
      evidence: [
        "url.pathname.toLowerCase() === '/ping'",
        "request.method === 'HEAD' ? null : '.'",
        "'content-type': 'text/plain'"
      ]
    },
    'MOUNT /debug': {
      disposition: 'local-tooling',
      evidenceFile: 'api/api.go',
      evidence: [
        'if s.Config.Profiling.Enabled',
        'middleware.BasicAuth(',
        'r.Mount("/debug"'
      ]
    }
  },
  matchmaker: {
    'HANDLE /': {
      disposition: 'ported',
      evidenceFile: 'matchmaker-ts/src/worker.ts',
      evidence: ['MATCHMAKER_PATH', "request.headers.get('Upgrade')"]
    },
    'HANDLE /matchinfo/{playerID}': {
      disposition: 'ported',
      evidenceFile: 'cloudflare/src/multiplayer-gateway.ts',
      evidence: [
        "const MATCH_INFO_PREFIX = '/api/matchmaker/matchinfo/'",
        'matchInfoPrincipal(',
        'recentMatchInfo(env, principal)'
      ]
    },
    'HANDLE /status': {
      disposition: 'internalized',
      evidenceFile: 'matchmaker-ts/src/runtime.ts',
      evidence: [
        "url.pathname === '/internal/status'",
        'request.headers.get(INTERNAL_AUTH_HEADER)',
        'queuedPlayers: tickets.size'
      ]
    },
    'HEARTBEAT /ping': {
      disposition: 'ported',
      evidenceFile: 'matchmaker-ts/src/worker.ts',
      evidence: [
        "url.pathname.toLowerCase() === '/ping'",
        "request.method === 'HEAD' ? null : '.'",
        "'content-type': 'text/plain'"
      ]
    }
  },
  gameServer: {
    'GET /': {
      disposition: 'ported',
      evidenceFile: 'game-server-cloudflare/src/worker.ts',
      evidence: ["sourcePath === '/'", "sourceServiceResponse(request, '.')"]
    },
    'GET /ping': {
      disposition: 'ported',
      evidenceFile: 'game-server-cloudflare/src/worker.ts',
      evidence: [
        "sourcePath === '/ping' || sourcePath === '/ping/'",
        "sourceServiceResponse(request, 'pong')",
        "'content-type': 'text/html; charset=utf-8'"
      ]
    },
    'GET /metrics': {
      disposition: 'superseded',
      evidenceFile: 'game-server-cloudflare/src/worker.ts',
      evidence: [
        'source process-global /metrics scrape is superseded',
        "Cloudflare's",
        'do not expose a partial'
      ]
    },
    'GET /status': {
      disposition: 'internalized',
      evidenceFile: 'game-server-cloudflare/src/game-match.ts',
      evidence: [
        "url.pathname === '/internal/status'",
        'if (!this.isInternal(request))',
        'sockets: this.state.getWebSockets().length'
      ]
    },
    'POST /createMatch': {
      disposition: 'ported',
      evidenceFile: 'game-server-cloudflare/src/worker.ts',
      evidence: [
        "url.pathname === '/internal/matches'",
        'if (!isInternal(request, env))',
        "new Request('https://game-match/internal/create'"
      ]
    }
  }
}

export const REQUIRED_ROUTE_GATE_SCRIPTS = [
  'build:cloudflare',
  'deploy:cloudflare:game-server',
  'deploy:cloudflare:matchmaker'
]

export const routeGateScriptErrors = scripts =>
  REQUIRED_ROUTE_GATE_SCRIPTS.flatMap(script =>
    scripts?.[script]?.includes('pnpm check:cloudflare:service-routes')
      ? []
      : [`${script} must run the source service-route inventory gate`]
  )

export const auditServiceRoutes = ({ routes, evidenceSources, scripts }) => {
  const errors = []
  for (const [service, expectedRoutes] of Object.entries(
    EXPECTED_SOURCE_SERVICE_ROUTES
  )) {
    const actual = routes[service] ?? []
    const expected = Object.keys(expectedRoutes).sort()
    for (const route of actual) {
      if (!expected.includes(route)) {
        errors.push(`unreviewed ${service} source route: ${route}`)
      }
    }
    for (const route of expected) {
      if (!actual.includes(route)) {
        errors.push(`reviewed ${service} source route disappeared: ${route}`)
      }
      const review = expectedRoutes[route]
      if (review.disposition === 'retired') {
        errors.push(
          `${service} ${route} is an active source route and cannot be retired without a replacement contract`
        )
      }
      const evidence = evidenceSources[review.evidenceFile] ?? ''
      for (const token of review.evidence) {
        if (!evidence.includes(token)) {
          errors.push(
            `${service} ${route} is missing ${review.disposition} evidence: ${token}`
          )
        }
      }
    }
  }
  errors.push(...routeGateScriptErrors(scripts))
  return { routes, errors }
}

export const loadServiceRouteAudit = async root => {
  const [api, matchmaker, gameServer, rootPackage] = await Promise.all([
    readFile(path.join(root, 'api/api.go'), 'utf8'),
    readFile(path.join(root, 'matchmaker/app.go'), 'utf8'),
    readFile(path.join(root, 'server/src/Server.ts'), 'utf8'),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const evidenceFiles = new Set(
    Object.values(EXPECTED_SOURCE_SERVICE_ROUTES).flatMap(service =>
      Object.values(service).map(review => review.evidenceFile)
    )
  )
  const evidenceSources = Object.fromEntries(
    await Promise.all(
      [...evidenceFiles].map(async file => [
        file,
        await readFile(path.join(root, file), 'utf8')
      ])
    )
  )
  return auditServiceRoutes({
    routes: {
      api: extractApiRoutes(api),
      matchmaker: extractMatchmakerRoutes(matchmaker),
      gameServer: extractGameServerRoutes(gameServer)
    },
    evidenceSources,
    scripts: rootPackage.scripts
  })
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const audit = await loadServiceRouteAudit(root)
  for (const [service, routes] of Object.entries(audit.routes)) {
    process.stdout.write(`${service} source routes: ${routes.length}\n`)
  }
  for (const error of audit.errors) {
    process.stderr.write(`Service route audit: ${error}\n`)
  }
  if (audit.errors.length) process.exitCode = 1
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
