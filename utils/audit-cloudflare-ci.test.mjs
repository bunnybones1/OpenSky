import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ciWorkflowAuditErrors,
  cloudflareBuildScriptErrors
} from './audit-cloudflare-ci.mjs'

const validWorkflow = `
pull_request:
contents: read
cancel-in-progress: true
timeout-minutes: 30
RELEASE_VERSION: cloudflare
GITCOMMIT: cloudflare
actions/checkout@v7.0.1
persist-credentials: false
pnpm/action-setup@v6.0.10
actions/setup-node@v7.0.0
node-version-file: .nvmrc
pnpm install --frozen-lockfile
pnpm build:cloudflare
`

test('accepts the read-only complete pull-request release contract', () => {
  assert.deepEqual(ciWorkflowAuditErrors(validWorkflow, '24.5.0'), [])
})

test('rejects a partial workflow or stale Node runtime', () => {
  const errors = ciWorkflowAuditErrors(
    validWorkflow.replace('pnpm build:cloudflare', 'pnpm typecheck'),
    '18.6.0'
  )
  assert.ok(errors.some(error => error.includes('pnpm build:cloudflare')))
  assert.ok(errors.some(error => error.includes('Wrangler >=22')))
})

test('rejects deployment authority in pull-request CI', () => {
  for (const forbidden of [
    'wrangler deploy',
    'deploy:cloudflare',
    'CLOUDFLARE_API_TOKEN',
    'secrets.CLOUDFLARE_TOKEN'
  ]) {
    const errors = ciWorkflowAuditErrors(`${validWorkflow}\n${forbidden}`, '24')
    assert.ok(errors.some(error => error.includes(forbidden.split('.')[0])))
  }
})

test('requires generated wire and browser lifecycle gates in the complete build', async () => {
  const rootPackage = JSON.parse(await readFile('package.json', 'utf8'))
  assert.deepEqual(cloudflareBuildScriptErrors(rootPackage), [])
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:match-wire && ',
          ''
        )
      }
    })[0],
    /match wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:match-completion && ',
          ''
        )
      }
    })[0],
    /transactional match completion/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:match-reward-wire && ',
          ''
        )
      }
    })[0],
    /match reward wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:conquest-wire && ',
          ''
        )
      }
    })[0],
    /Conquest wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:account-wire && ',
          ''
        )
      }
    })[0],
    /Account wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:account-stat-wire && ',
          ''
        )
      }
    })[0],
    /AccountStat wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:deck-wire && ',
          ''
        )
      }
    })[0],
    /Deck wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:card-wire && ',
          ''
        )
      }
    })[0],
    /Card wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:card-balance-wire && ',
          ''
        )
      }
    })[0],
    /CardWithBalance wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:card-ownership-wire && ',
          ''
        )
      }
    })[0],
    /CardOwnershipResponse wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:pending-card-wire && ',
          ''
        )
      }
    })[0],
    /PendingCardsResponse wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:feed-event-wire && ',
          ''
        )
      }
    })[0],
    /FeedEvent wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:item-wire && ',
          ''
        )
      }
    })[0],
    /Item wire/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:browser-cache && ',
          ''
        )
      }
    })[0],
    /browser cache lifecycle/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:system-player-gate && ',
          ''
        )
      }
    })[0],
    /system-player isolation/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:reward-timing && ',
          ''
        )
      }
    })[0],
    /reward timing visibility/
  )
  assert.match(
    cloudflareBuildScriptErrors({
      ...rootPackage,
      scripts: {
        ...rootPackage.scripts,
        'build:cloudflare': rootPackage.scripts['build:cloudflare'].replace(
          'pnpm check:cloudflare:branding && ',
          ''
        )
      }
    })[0],
    /original-game branding/
  )
})
