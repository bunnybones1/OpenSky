import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyRolloutPlan,
  callOperatorRpc,
  canonicalRolloutBody,
  rolloutPlan,
  runConquestRolloutCli
} from './cloudflare-conquest-rollout.mjs'

const session = 'a'.repeat(64)
const url = 'https://cloud-weasel.example'
const operationKey = 'b63d93a0-582c-4bd8-a2aa-152b916f7327'
const settlementKey = '8ab3b6d9-ac39-48db-9819-009520013e7a'
const deliveryKey = '2e3ef270-9a20-49b5-90c4-e54724569601'
const headers = { 'cache-control': 'no-store' }

const proposal = {
  version: 'season-12-week-1',
  startsAt: '2026-08-17T00:00:00.000Z',
  endsAt: '2026-08-24T00:00:00.000Z',
  silverCardIds: [6, 14],
  goldCardIds: [136],
  reason: 'Reviewed Cloud Weasel Conquest pool.',
  reviewReference: 'change-control:CW-1201'
}

test('builds deterministic, canonical mutation plans', () => {
  const first = rolloutPlan('propose', proposal)
  const second = rolloutPlan('propose', structuredClone(proposal))
  assert.deepEqual(first, second)
  assert.equal(
    first.confirmation,
    'sha256:c34f12be71cb782bafede0032177afa47508747ee43e1b18ceae765198bcb476'
  )
  assert.equal(first.rpcMethod, 'GMProposeConquestRewardPool')
  assert.deepEqual(first.requestBody, proposal)

  assert.deepEqual(
    canonicalRolloutBody('activate', {
      version: proposal.version,
      cardManifest: [
        'SW_SILVER_CARDS:6',
        'SW_SILVER_CARDS:14',
        'SW_GOLD_CARDS:136'
      ],
      reason: 'Independent manifest review complete.'
    }).cardManifest,
    ['SW_SILVER_CARDS:6', 'SW_SILVER_CARDS:14', 'SW_GOLD_CARDS:136']
  )
  assert.deepEqual(
    canonicalRolloutBody('verify', {
      poolVersion: proposal.version,
      conquestId: 12,
      settlementKey: settlementKey.toUpperCase(),
      deliveryKey: deliveryKey.toUpperCase(),
      drillReference: 'runbook:CW-CONQUEST-12'
    }),
    {
      poolVersion: proposal.version,
      conquestId: 12,
      settlementKey,
      deliveryKey,
      drillReference: 'runbook:CW-CONQUEST-12'
    }
  )
  assert.deepEqual(
    canonicalRolloutBody('run-drill', {
      poolVersion: proposal.version,
      reason: 'Run three real guarded matches.'
    }),
    {
      poolVersion: proposal.version,
      reason: 'Run three real guarded matches.'
    }
  )
})

test('rejects ambiguous or non-canonical product configuration', () => {
  assert.throws(
    () => rolloutPlan('propose', { ...proposal, extra: true }),
    /unexpected rollout fields/
  )
  assert.throws(
    () => rolloutPlan('propose', { ...proposal, silverCardIds: [14, 6] }),
    /strictly ascending/
  )
  assert.throws(
    () =>
      rolloutPlan('propose', {
        ...proposal,
        startsAt: '2026-08-17T00:00:00Z'
      }),
    /canonical UTC/
  )
  assert.throws(
    () =>
      rolloutPlan('activate', {
        version: proposal.version,
        cardManifest: ['SW_GOLD_CARDS:136', 'SW_SILVER_CARDS:6'],
        reason: 'reviewed'
      }),
    /Silver-first/
  )
  assert.throws(
    () =>
      rolloutPlan('verify', {
        poolVersion: proposal.version,
        conquestId: 0,
        settlementKey,
        deliveryKey,
        drillReference: 'runbook'
      }),
    /positive integer/
  )
})

test('requires two-phase confirmation and an explicit idempotency key', async () => {
  const plan = rolloutPlan('retire', {
    version: proposal.version,
    reason: 'Emergency retirement reviewed.'
  })
  let called = false
  const fetchImpl = async () => {
    called = true
    return Response.json({ pool: {} }, { headers })
  }
  await assert.rejects(
    applyRolloutPlan({
      plan,
      confirmation: 'sha256:wrong',
      operationKey,
      baseUrl: url,
      sessionToken: session,
      fetchImpl
    }),
    /confirmation digest/
  )
  await assert.rejects(
    applyRolloutPlan({
      plan,
      confirmation: plan.confirmation,
      operationKey: 'generated-for-me',
      baseUrl: url,
      sessionToken: session,
      fetchImpl
    }),
    /explicit UUID/
  )
  assert.equal(called, false)
})

test('sends the exact RPC body, cookie, operation key, and redirect policy', async () => {
  const plan = rolloutPlan('activate', {
    version: proposal.version,
    cardManifest: [
      'SW_SILVER_CARDS:6',
      'SW_SILVER_CARDS:14',
      'SW_GOLD_CARDS:136'
    ],
    reason: 'Independent manifest review complete.'
  })
  let request
  const response = await applyRolloutPlan({
    plan,
    confirmation: plan.confirmation,
    operationKey,
    baseUrl: url,
    sessionToken: session,
    fetchImpl: async (target, init) => {
      request = { target, init }
      return Response.json({ pool: { version: proposal.version } }, { headers })
    }
  })
  assert.deepEqual(response, { pool: { version: proposal.version } })
  assert.equal(
    request.target,
    `${url}/api/rpc/SkyWeaverAPI/GMActivateConquestRewardPool`
  )
  assert.equal(request.init.redirect, 'error')
  assert.equal(
    request.init.headers.cookie,
    `opensky_identity_session=${session}`
  )
  assert.equal(
    request.init.headers['x-cloud-weasel-operation-key'],
    operationKey
  )
  assert.deepEqual(JSON.parse(request.init.body), plan.requestBody)
})

test('read commands omit mutation headers and preserve version filters', async () => {
  let request
  const outputs = []
  await runConquestRolloutCli(
    ['list-readiness', '--version', proposal.version],
    {
      CLOUD_WEASEL_OPERATOR_URL: url,
      CLOUD_WEASEL_OPERATOR_SESSION: session
    },
    {
      output: value => outputs.push(value),
      fetchImpl: async (target, init) => {
        request = { target, init }
        return Response.json({ evidence: [] }, { headers })
      }
    }
  )
  assert.equal(
    request.target,
    `${url}/api/rpc/SkyWeaverAPI/GMListConquestReadiness`
  )
  assert.equal(request.init.headers['x-cloud-weasel-operation-key'], undefined)
  assert.deepEqual(JSON.parse(request.init.body), {
    poolVersion: proposal.version
  })
  assert.deepEqual(JSON.parse(outputs[0]), { evidence: [] })

  await runConquestRolloutCli(
    ['list-drills', '--version', proposal.version],
    {
      CLOUD_WEASEL_OPERATOR_URL: url,
      CLOUD_WEASEL_OPERATOR_SESSION: session
    },
    {
      output: value => outputs.push(value),
      fetchImpl: async (target, init) => {
        request = { target, init }
        return Response.json({ operations: [] }, { headers })
      }
    }
  )
  assert.equal(
    request.target,
    `${url}/api/rpc/SkyWeaverAPI/GMListConquestDrills`
  )
  assert.equal(request.init.headers['x-cloud-weasel-operation-key'], undefined)
  assert.deepEqual(JSON.parse(request.init.body), {
    poolVersion: proposal.version
  })
  assert.deepEqual(JSON.parse(outputs[1]), { operations: [] })
})

test('drill execution keeps the same offline plan and exact confirmation boundary', async () => {
  const input = {
    poolVersion: proposal.version,
    reason: 'Run source-faithful readiness matches.'
  }
  const plan = rolloutPlan('run-drill', input)
  assert.equal(plan.rpcMethod, 'GMStartConquestDrill')
  let request
  const result = await applyRolloutPlan({
    plan,
    confirmation: plan.confirmation,
    operationKey,
    baseUrl: url,
    sessionToken: session,
    fetchImpl: async (target, init) => {
      request = { target, init }
      return Response.json(
        { operation: { status: 'RUNNING', completedMatchCount: 0 } },
        { headers }
      )
    }
  })
  assert.equal(
    request.target,
    `${url}/api/rpc/SkyWeaverAPI/GMStartConquestDrill`
  )
  assert.deepEqual(JSON.parse(request.init.body), input)
  assert.deepEqual(result, {
    operation: { status: 'RUNNING', completedMatchCount: 0 }
  })
})

test('CLI plans are offline and apply only the exact displayed digest', async () => {
  const input = JSON.stringify(proposal)
  const outputs = []
  let calls = 0
  const dependencies = {
    output: value => outputs.push(value),
    readFile: async () => input,
    fetchImpl: async () => {
      calls++
      return Response.json({ pool: { version: proposal.version } }, { headers })
    }
  }
  await runConquestRolloutCli(
    ['propose', '--input', 'pool.json'],
    {},
    dependencies
  )
  assert.equal(calls, 0)
  const plan = JSON.parse(outputs.pop())
  await runConquestRolloutCli(
    [
      'propose',
      '--input',
      'pool.json',
      '--apply',
      '--operation-key',
      operationKey,
      '--confirm',
      plan.confirmation
    ],
    {
      CLOUD_WEASEL_OPERATOR_URL: url,
      CLOUD_WEASEL_OPERATOR_SESSION: session
    },
    dependencies
  )
  assert.equal(calls, 1)
  assert.equal(JSON.parse(outputs.pop()).mode, 'APPLIED')
})

test('rejects redirects, unsafe origins, malformed sessions, and cacheable replies', async () => {
  const base = {
    method: 'GMListConquestRewardPools',
    body: {},
    sessionToken: session
  }
  await assert.rejects(
    callOperatorRpc({
      ...base,
      baseUrl: 'http://cloud-weasel.example',
      fetchImpl: async () => Response.json({}, { headers })
    }),
    /HTTPS except on loopback/
  )
  await assert.rejects(
    callOperatorRpc({
      ...base,
      baseUrl: `${url}/api`,
      fetchImpl: async () => Response.json({}, { headers })
    }),
    /explicit HTTP\(S\) origin/
  )
  await assert.rejects(
    callOperatorRpc({
      ...base,
      baseUrl: url,
      sessionToken: 'opensky_identity_session=secret',
      fetchImpl: async () => Response.json({}, { headers })
    }),
    /missing or malformed/
  )
  await assert.rejects(
    callOperatorRpc({
      ...base,
      baseUrl: url,
      fetchImpl: async () => Response.json({}, { headers: {} })
    }),
    /Cache-Control: no-store/
  )
  const local = await callOperatorRpc({
    ...base,
    baseUrl: 'http://127.0.0.1:8787',
    fetchImpl: async () => Response.json({ pools: [] }, { headers })
  })
  assert.deepEqual(local, { pools: [] })
})

test('bounds input files and rejects duplicate apply flags', async () => {
  await assert.rejects(
    runConquestRolloutCli(
      ['propose', '--input', 'huge.json'],
      {},
      { readFile: async () => ' '.repeat(128 * 1024 + 1), output: () => {} }
    ),
    /exceeds 131072 bytes/
  )
  await assert.rejects(
    runConquestRolloutCli(
      ['propose', '--input', 'pool.json', '--apply', '--apply'],
      {},
      { readFile: async () => JSON.stringify(proposal), output: () => {} }
    ),
    /duplicate option/
  )
})

test('surfaces bounded RPC errors without exposing the session', async () => {
  await assert.rejects(
    callOperatorRpc({
      baseUrl: url,
      sessionToken: session,
      method: 'GMListConquestRewardPools',
      body: {},
      fetchImpl: async () =>
        Response.json(
          { code: 'webrpc.permission_denied', msg: 'admin access required' },
          { status: 403, headers }
        )
    }),
    error => {
      assert.match(error.message, /403 webrpc.permission_denied/)
      assert.doesNotMatch(error.message, new RegExp(session))
      return true
    }
  )
})
