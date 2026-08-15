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

const field = (name, type, json, omitEmpty = false) => ({
  name,
  type,
  json,
  omitEmpty
})

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const reportWireErrors = (
  generatedSource,
  sourceRPC,
  workerReport,
  api,
  gameUI,
  packageSource
) => {
  const errors = []
  const expected = [
    field('ReportedAddress', 'Hash', 'reportedAddress'),
    field('MatchID', 'uint64', 'matchId'),
    field('ReporterComment', 'string', 'reporterComment')
  ]
  if (
    JSON.stringify(structFields(structBody(generatedSource, 'Report'))) !==
    JSON.stringify(expected)
  ) {
    errors.push('source Report JSON contract changed')
  }

  const sourceRoute = section(
    sourceRPC,
    'func (s *Server) ReportAccount(',
    'func (s *Server) GMSetReviewed('
  )
  for (const token of [
    'if report == nil {',
    'proto.ErrorInvalidArgument("report", "missing report data")',
    'repo.Matches().FindByID(report.MatchID)',
    'report.ReportedAddress.String() == account.Address.String()',
    'match.Player1ID != account.ID && match.Player2ID != account.ID',
    'data.DB.Accounts(repo).FindByAddress(report.ReportedAddress)',
    'match.Player1ID != reportedAccount.ID && match.Player2ID != reportedAccount.ID',
    'report.ReporterComment = plainTextPolicy.Sanitize(report.ReporterComment)',
    'if len(report.ReporterComment) > 4000 {',
    'report.ReporterComment = report.ReporterComment[0:4000]',
    'SignalType:   signals.USER_REPORT,',
    'SignalStatus: proto.SignalStatus_PENDING',
    'MatchID:    report.MatchID',
    'Comment:    report.ReporterComment',
    'repo.AccountSignals().Session().Save(signal)'
  ]) {
    if (!sourceRoute.includes(token)) {
      errors.push(`source ReportAccount behavior changed: ${token}`)
    }
  }

  const compactWorker = workerReport.replace(/\s+/g, ' ')
  for (const token of [
    "reportedAddress: input.reportedAddress ?? ''",
    'matchId: input.matchId ?? 0',
    "reporterComment: input.reporterComment ?? ''",
    "typeof input.reportedAddress !== 'string'",
    "typeof input.matchId !== 'number'",
    '!Number.isSafeInteger(input.matchId)',
    'input.matchId < 0',
    "typeof input.reporterComment !== 'string'",
    'const report = sourceReportRequest(input)',
    'if (report.matchId <= 0)',
    'sanitizeReportComment(report.reporterComment)',
    'truncateUtf8(',
    '4000',
    'reporterPlayer === undefined',
    'opponentUserId !== reportedUserId',
    'ON CONFLICT(match_id, reporter_user_id) DO NOTHING'
  ]) {
    if (!compactWorker.includes(token)) {
      errors.push(`main Worker ReportAccount behavior is missing: ${token}`)
    }
  }

  const workerRoute = section(
    api,
    "case 'ReportAccount':",
    "case 'GetMatchArchiveRecordsURI':"
  )
  for (const token of [
    'if (!body.report)',
    'accountReports.report(principal.userId, body.report)'
  ]) {
    if (!workerRoute.includes(token)) {
      errors.push(`main Worker ReportAccount route changed: ${token}`)
    }
  }

  const browserRoute = section(gameUI, '.reportAccount({', '.then(() =>')
  for (const token of [
    'matchId: store.matchID',
    'reportedAddress: opptAddress',
    'reporterComment: reportType'
  ]) {
    if (!browserRoute.includes(token)) {
      errors.push(`preserved game report request changed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:report-wire'] !==
    'node --test ./utils/check-cloudflare-report-wire.test.mjs && node ./utils/check-cloudflare-report-wire.mjs'
  ) {
    errors.push('package scripts lost the ReportAccount wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:report-wire'
    )
  ) {
    errors.push(
      'complete Cloudflare build bypasses the ReportAccount wire gate'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/admin_ban_tools.go',
    'cloudflare/src/account-reports.ts',
    'cloudflare/src/api.ts',
    'game/src/scenes/ui/containers/report.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = reportWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'ReportAccount preserves generated fields, zero-value comments, sanitization, match/opponent authorization, and the original game request'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
