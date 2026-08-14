import assert from 'node:assert/strict'
import test from 'node:test'

import {
  browserMethodToRpc,
  browserRpcAuditErrors,
  extractBrowserRpcCalls
} from './audit-cloudflare-browser-rpcs.mjs'

test('extracts real webapp and game RPC calls without comments or properties', () => {
  assert.deepEqual(
    extractBrowserRpcCalls(
      `
        APIClient.opensky.getAccount({ address })
        APIClient.opensky
          .gMFindAccount({ query })
          .then(useAccount)
        apiClient.conquestStatus()
        this.searchCards({ req })
        APIClient.opensky.authToken = token
        // APIClient.opensky.entirelyCommentedOut()
        window.apiClient.getSession()
      `,
      [['APIClient', 'opensky'], ['apiClient'], ['this']]
    ),
    ['conquestStatus', 'gMFindAccount', 'getAccount', 'searchCards']
  )
  assert.equal(browserMethodToRpc('gMFindAccount'), 'GMFindAccount')
  assert.equal(browserMethodToRpc('iAPVerifyGoogleProducts2'), 'IAPVerifyGoogleProducts2')
})

test('fails when a preserved browser call has no Worker handler', () => {
  assert.deepEqual(
    browserRpcAuditErrors({
      browserMethods: ['getAccount', 'listQuests'],
      sourceMethods: ['GetAccount', 'ListQuests'],
      workerMethods: ['GetAccount'],
      tombstones: {},
      reviewedNonPorts: {},
      reviewedBrowserRpcs: new Set(['GetAccount', 'ListQuests'])
    }),
    ['browser source RPC has no Worker handler: ListQuests']
  )
})

test('requires explicit source and migration dispositions for browser non-ports', () => {
  const errors = browserRpcAuditErrors({
    browserMethods: ['getAccount'],
    sourceMethods: ['GetAccount'],
    workerMethods: ['GetAccount'],
    tombstones: {},
    reviewedNonPorts: {
      EntirelyInvented: 'invalid review',
      GetAccount: 'cannot hide a functional handler'
    },
    reviewedBrowserRpcs: new Set(['GetAccount'])
  })
  assert.ok(
    errors.includes(
      'reviewed browser non-port is not a source RPC: EntirelyInvented'
    )
  )
  assert.ok(
    errors.includes(
      'reviewed browser non-port lacks an RPC disposition: GetAccount'
    )
  )
  assert.ok(
    errors.includes(
      'reviewed browser non-port unexpectedly has a Worker handler: GetAccount'
    )
  )
})

test('accepts a reviewed browser call replaced by the identity product', () => {
  assert.deepEqual(
    browserRpcAuditErrors({
      browserMethods: ['requestAccountDeletion'],
      sourceMethods: ['RequestAccountDeletion'],
      workerMethods: [],
      tombstones: {},
      reviewedNonPorts: {
        RequestAccountDeletion: 'Google OIDC step-up deletion flow'
      },
      reviewedBrowserRpcs: new Set(['RequestAccountDeletion'])
    }),
    []
  )
})

test('fails closed when a reviewed original browser call disappears or a new one appears', () => {
  assert.deepEqual(
    browserRpcAuditErrors({
      browserMethods: ['getAccount', 'listQuests'],
      sourceMethods: ['GetAccount', 'ListQuests'],
      workerMethods: ['GetAccount', 'ListQuests'],
      tombstones: {},
      reviewedNonPorts: {},
      reviewedBrowserRpcs: new Set(['GetAccount', 'GetFeed'])
    }).slice(0, 2),
    [
      'unreviewed browser source RPC call: ListQuests',
      'reviewed browser source RPC call disappeared: GetFeed'
    ]
  )
})
