import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_SOURCE_SERVICE_ROUTES,
  REQUIRED_ROUTE_GATE_SCRIPTS,
  auditServiceRoutes,
  extractApiRoutes,
  extractGameServerRoutes,
  extractMatchmakerRoutes,
  routeGateScriptErrors
} from './audit-cloudflare-service-routes.mjs'

const reviewedRoutes = () =>
  Object.fromEntries(
    Object.entries(EXPECTED_SOURCE_SERVICE_ROUTES).map(([service, routes]) => [
      service,
      Object.keys(routes).sort()
    ])
  )

const completeEvidence = () => {
  const evidence = {}
  for (const routes of Object.values(EXPECTED_SOURCE_SERVICE_ROUTES)) {
    for (const review of Object.values(routes)) {
      evidence[review.evidenceFile] = [
        evidence[review.evidenceFile] ?? '',
        ...review.evidence
      ].join('\n')
    }
  }
  return evidence
}

const reviewedScripts = () =>
  Object.fromEntries(
    REQUIRED_ROUTE_GATE_SCRIPTS.map(script => [
      script,
      'pnpm check:cloudflare:service-routes'
    ])
  )

test('extracts active service routes while ignoring commented examples', () => {
  assert.deepEqual(
    extractApiRoutes(`
      r.Use(middleware.Heartbeat("/ping"))
      r.Get("/status", status)
      r.Mount("/debug", profiler)
      r.Handle("/*", rpc)
      // r.Get("/retired", retired)
    `),
    ['GET /status', 'HANDLE /*', 'HEARTBEAT /ping', 'MOUNT /debug']
  )
  assert.deepEqual(
    extractMatchmakerRoutes(`
      r.Use(middleware.Heartbeat("/ping"))
      r.HandleFunc("/", socket)
      r.HandleFunc("/", socket)
      r.HandleFunc("/status", status)
      /* r.HandleFunc("/old", old) */
    `),
    ['HANDLE /', 'HANDLE /status', 'HEARTBEAT /ping']
  )
  assert.deepEqual(
    extractGameServerRoutes(`
      app.get('/', root)
      app.get('/ping', ping)
      app.post('/createMatch', create)
      // app.get('/old', old)
    `),
    ['GET /', 'GET /ping', 'POST /createMatch']
  )
})

test('accepts every reviewed source service route and its implementation evidence', () => {
  assert.deepEqual(
    auditServiceRoutes({
      routes: reviewedRoutes(),
      evidenceSources: completeEvidence(),
      scripts: reviewedScripts()
    }).errors,
    []
  )
})

test('rejects new routes, removed reviews, and missing port evidence', () => {
  const routes = reviewedRoutes()
  routes.api.push('GET /new-service-surface')
  routes.matchmaker = routes.matchmaker.filter(
    route => route !== 'HANDLE /matchinfo/{playerID}'
  )
  const evidence = completeEvidence()
  evidence['game-server-cloudflare/src/worker.ts'] = ''
  const errors = auditServiceRoutes({
    routes,
    evidenceSources: evidence,
    scripts: reviewedScripts()
  }).errors
  assert.ok(
    errors.includes('unreviewed api source route: GET /new-service-surface')
  )
  assert.ok(
    errors.includes(
      'reviewed matchmaker source route disappeared: HANDLE /matchinfo/{playerID}'
    )
  )
  assert.ok(
    errors.some(error =>
      error.includes('gameServer GET /ping is missing ported evidence')
    )
  )
})

test('rejects blanket retirement of an active source route', () => {
  const review = EXPECTED_SOURCE_SERVICE_ROUTES.api['HEARTBEAT /ping']
  const original = review.disposition
  review.disposition = 'retired'
  try {
    assert.ok(
      auditServiceRoutes({
        routes: reviewedRoutes(),
        evidenceSources: completeEvidence(),
        scripts: reviewedScripts()
      }).errors.includes(
        'api HEARTBEAT /ping is an active source route and cannot be retired without a replacement contract'
      )
    )
  } finally {
    review.disposition = original
  }
})

test('requires the route gate in full and component deployment contracts', () => {
  assert.deepEqual(routeGateScriptErrors(reviewedScripts()), [])
  const scripts = reviewedScripts()
  scripts['deploy:cloudflare:game-server'] = 'pnpm test'
  assert.deepEqual(routeGateScriptErrors(scripts), [
    'deploy:cloudflare:game-server must run the source service-route inventory gate'
  ])
})
