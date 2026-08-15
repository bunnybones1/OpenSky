import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { reportWireErrors } from './check-cloudflare-report-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/admin_ban_tools.go',
  'cloudflare/src/account-reports.ts',
  'cloudflare/src/api.ts',
  'game/src/scenes/ui/containers/report.ts',
  'package.json'
]

const fixtures = async () => {
  const values = await Promise.all(
    fixtureFiles.map(file => readFile(file, 'utf8'))
  )
  return Object.fromEntries(
    fixtureFiles.map((file, index) => [file, values[index]])
  )
}

const errorsFor = value => reportWireErrors(...Object.values(value))

test('derives and enforces ReportAccount from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects field, zero-value, policy, route, browser, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => {
    assert.ok(value[file].includes(from), `missing mutation fixture: ${from}`)
    return { ...value, [file]: value[file].replace(from, to) }
  }
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'ReportedAddress Hash   `json:"reportedAddress"',
      'ReportedAddress string `json:"reportedAddress"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'MatchID         uint64 `json:"matchId"',
      'MatchID         uint32 `json:"matchId"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'ReporterComment string `json:"reporterComment"',
      'ReporterComment string `json:"comment"'
    ),
    mutate('api/rpc/admin_ban_tools.go', 'if report == nil {', 'if false {'),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'match.Player1ID != account.ID && match.Player2ID != account.ID',
      'match.Player1ID != account.ID'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'plainTextPolicy.Sanitize(report.ReporterComment)',
      'report.ReporterComment'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'len(report.ReporterComment) > 4000',
      'len(report.ReporterComment) > 8000'
    ),
    mutate(
      'api/rpc/admin_ban_tools.go',
      'AccountID:    reportedAccount.ID,\n\t\t\tSignalType:   signals.USER_REPORT',
      'AccountID:    reportedAccount.ID,\n\t\t\tSignalType:   signals.USER_REPORT_COUNT'
    ),
    mutate(
      'cloudflare/src/account-reports.ts',
      "reportedAddress: input.reportedAddress ?? ''",
      "reportedAddress: input.reportedAddress ?? 'missing'"
    ),
    mutate(
      'cloudflare/src/account-reports.ts',
      "reporterComment: input.reporterComment ?? ''",
      "reporterComment: input.reporterComment ?? 'missing'"
    ),
    mutate(
      'cloudflare/src/account-reports.ts',
      'sanitizeReportComment(report.reporterComment)',
      'report.reporterComment'
    ),
    mutate(
      'cloudflare/src/account-reports.ts',
      'opponentUserId !== reportedUserId',
      'opponentUserId === reportedUserId'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'accountReports.report(principal.userId, body.report)',
      'accountReports.report(principal.userId, {})'
    ),
    mutate(
      'game/src/scenes/ui/containers/report.ts',
      'reporterComment: reportType',
      "reporterComment: ''"
    ),
    mutate('package.json', 'pnpm check:cloudflare:report-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
