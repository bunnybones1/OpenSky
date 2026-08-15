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

const enumNames = (source, name) => {
  const block = source.match(
    new RegExp(`type ${name} uint(?:16|32|64)?\\s+const \\(([\\s\\S]*?)\\n\\)`)
  )?.[1]
  return block
    ? [...block.matchAll(new RegExp(`^\\s*${name}_(\\w+)\\s+`, 'gm'))].map(
        match => match[1]
      )
    : []
}

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const paymentWireErrors = (
  generatedSource,
  customTypesSource,
  rpcSource,
  paymentWire,
  api,
  packageSource
) => {
  const errors = []
  const expectedPaymentFields = [
    field('ID', 'uint64', 'id'),
    field('AccountID', 'AccountID', 'accountID'),
    field('Status', '*PaymentStatus', 'status'),
    field('Provider', '*PaymentProvider', 'provider'),
    field('ExternalTxnID', 'string', 'externalTxnID'),
    field('CreatedAt', '*time.Time', 'createdAt'),
    field('Cursor', 'string', '-')
  ]
  const expectedLogFields = [
    field('ID', 'uint64', 'id'),
    field('PaymentID', 'uint64', 'paymentID'),
    field('Data', '*PaymentLogData', 'data'),
    field('CreatedAt', '*time.Time', 'createdAt')
  ]
  const expectedLogDataFields = [
    field('Type', 'string', 'type'),
    field('Data', 'json.RawMessage', 'data')
  ]
  if (
    JSON.stringify(structFields(structBody(generatedSource, 'Payment'))) !==
    JSON.stringify(expectedPaymentFields)
  ) {
    errors.push('source Payment JSON contract changed')
  }
  if (
    JSON.stringify(structFields(structBody(generatedSource, 'PaymentLog'))) !==
    JSON.stringify(expectedLogFields)
  ) {
    errors.push('source PaymentLog JSON contract changed')
  }
  if (
    JSON.stringify(
      structFields(structBody(customTypesSource, 'PaymentLogData'))
    ) !== JSON.stringify(expectedLogDataFields)
  ) {
    errors.push('source PaymentLogData JSON contract changed')
  }

  if (
    JSON.stringify(enumNames(generatedSource, 'PaymentStatus')) !==
    JSON.stringify(['INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED'])
  ) {
    errors.push('source PaymentStatus enum changed')
  }
  if (
    JSON.stringify(enumNames(generatedSource, 'PaymentProvider')) !==
    JSON.stringify([
      'UNKNOWN',
      'GOOGLE_PLAY',
      'APPLE_APP_STORE',
      'STRIPE',
      'SEQUENCE',
      'SAMSUNG_GALAXY_STORE'
    ])
  ) {
    errors.push('source PaymentProvider enum changed')
  }

  const paymentsRoute = section(
    rpcSource,
    'func (s *Server) GMListPayments(',
    'func (s *Server) GMListPaymentLogs('
  )
  for (const token of [
    'paymentsProto := make([]*proto.Payment, len(payments))',
    'paymentsProto[i] = payment.Payment',
    'return paginator.Page(), paymentsProto, nil'
  ]) {
    if (!paymentsRoute.includes(token)) {
      errors.push(`source payment-list response changed: ${token}`)
    }
  }
  const logsRoute = section(
    rpcSource,
    'func (s *Server) GMListPaymentLogs(',
    '// PaymentProviderResponseVerifier'
  )
  for (const token of [
    'paymentLogsProto := make([]*proto.PaymentLog, len(paymentLogs))',
    'paymentLogsProto[i] = paymentLog.PaymentLog',
    'return paymentLogsProto, nil'
  ]) {
    if (!logsRoute.includes(token)) {
      errors.push(`source payment-log response changed: ${token}`)
    }
  }

  const compactWire = paymentWire.replace(/\s+/g, ' ')
  for (const token of [
    'id: payment.id ?? 0',
    'accountID: payment.accountID ?? 0',
    'status: payment.status ?? null',
    'provider: payment.provider ?? null',
    "externalTxnID: payment.externalTxnID ?? ''",
    'createdAt: payment.createdAt ?? null',
    'payments.map(sourcePaymentWire)',
    "type: data.type ?? ''",
    'data: data.data ?? null',
    'id: log.id ?? 0',
    'paymentID: log.paymentID ?? 0',
    'data: sourcePaymentLogDataWire(log.data)',
    'createdAt: log.createdAt ?? null',
    'logs.map(sourcePaymentLogWire)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker payment wire is missing: ${token}`)
    }
  }
  if (/\bcursor\s*:/.test(paymentWire)) {
    errors.push('payment wire leaks the private cursor')
  }

  if (!api.includes("from './payment-wire'")) {
    errors.push('main Worker lost the shared payment wire import')
  }
  if (
    !section(
      api,
      "case 'GMListPayments':",
      "case 'GMListPaymentLogs':"
    ).includes('payments: sourcePaymentListWire(response.payments)')
  ) {
    errors.push('GMListPayments bypasses source normalization')
  }
  if (
    !section(
      api,
      "case 'GMListPaymentLogs':",
      "case 'ListSkypassRewards':"
    ).includes('logs: sourcePaymentLogListWire(')
  ) {
    errors.push('GMListPaymentLogs bypasses source normalization')
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:payment-wire'] !==
    'node --test ./utils/check-cloudflare-payment-wire.test.mjs && node ./utils/check-cloudflare-payment-wire.mjs'
  ) {
    errors.push('package scripts lost the payment wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:payment-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the payment wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/proto/types.go',
    'api/rpc/payments.go',
    'cloudflare/src/payment-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = paymentWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Payment enums, required pointers, private cursor, log data, and make-backed lists preserve generated Go semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
