import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const VERSION_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SESSION_PATTERN = /^[^\s;,=]{20,4096}$/
const RPC_PREFIX = '/api/rpc/SkyWeaverAPI/'
const OPERATION_HEADER = 'x-cloud-weasel-operation-key'
const MAX_INPUT_BYTES = 128 * 1024

const operations = {
  propose: {
    method: 'GMProposeConquestRewardPool',
    fields: [
      'version',
      'startsAt',
      'endsAt',
      'silverCardIds',
      'goldCardIds',
      'reason',
      'reviewReference'
    ]
  },
  activate: {
    method: 'GMActivateConquestRewardPool',
    fields: ['version', 'cardManifest', 'reason']
  },
  retire: {
    method: 'GMRetireConquestRewardPool',
    fields: ['version', 'reason']
  },
  verify: {
    method: 'GMVerifyConquestReadiness',
    fields: [
      'poolVersion',
      'conquestId',
      'settlementKey',
      'deliveryKey',
      'drillReference'
    ]
  }
}

const fail = message => {
  throw new Error(message)
}

const exactFields = (value, fields) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('rollout input must be a JSON object')
  }
  const keys = Object.keys(value)
  const extras = keys.filter(key => !fields.includes(key))
  const missing = fields.filter(key => !Object.hasOwn(value, key))
  if (extras.length) fail(`unexpected rollout fields: ${extras.join(', ')}`)
  if (missing.length) fail(`missing rollout fields: ${missing.join(', ')}`)
}

const version = (value, field = 'version') => {
  if (typeof value !== 'string' || !VERSION_PATTERN.test(value)) {
    fail(
      `${field} must contain 1 to 128 letters, numbers, dots, underscores, or hyphens`
    )
  }
  return value
}

const text = (value, field) => {
  if (typeof value !== 'string' || value !== value.trim()) {
    fail(`${field} must be trimmed text`)
  }
  if (value.length < 1 || value.length > 1000) {
    fail(`${field} must contain 1 to 1000 characters`)
  }
  return value
}

const canonicalDate = (value, field) => {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    fail(`${field} must be a valid timestamp`)
  }
  if (new Date(value).toISOString() !== value) {
    fail(`${field} must be a canonical UTC timestamp`)
  }
  return value
}

const sortedUniqueCardIds = (value, field) => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    !value.every(id => Number.isSafeInteger(id) && id > 0)
  ) {
    fail(`${field} must be a non-empty array of positive integer card IDs`)
  }
  if (new Set(value).size !== value.length) fail(`${field} contains duplicates`)
  if (value.some((id, index) => index > 0 && value[index - 1] >= id)) {
    fail(`${field} must be strictly ascending`)
  }
  return [...value]
}

const manifest = value => {
  if (!Array.isArray(value) || value.length < 2) {
    fail('cardManifest must contain at least one Silver and one Gold card')
  }
  const parsed = value.map(item => {
    if (typeof item !== 'string') fail('cardManifest entries must be strings')
    const match = /^(SW_SILVER_CARDS|SW_GOLD_CARDS):([1-9][0-9]*)$/.exec(item)
    if (!match || !Number.isSafeInteger(Number(match[2]))) {
      fail(`invalid cardManifest entry: ${item}`)
    }
    return { item, type: match[1], id: Number(match[2]) }
  })
  if (new Set(value).size !== value.length)
    fail('cardManifest contains duplicates')
  if (!parsed.some(item => item.type === 'SW_SILVER_CARDS')) {
    fail('cardManifest has no Silver cards')
  }
  if (!parsed.some(item => item.type === 'SW_GOLD_CARDS')) {
    fail('cardManifest has no Gold cards')
  }
  const canonical = [...parsed].sort(
    (left, right) =>
      (left.type === right.type
        ? 0
        : left.type === 'SW_SILVER_CARDS'
          ? -1
          : 1) || left.id - right.id
  )
  if (canonical.some((item, index) => item.item !== value[index])) {
    fail(
      'cardManifest must be Silver-first and strictly ascending within each type'
    )
  }
  return [...value]
}

const receiptKey = (value, field) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    fail(`${field} must be a UUID receipt key`)
  }
  return value.toLowerCase()
}

export const canonicalRolloutBody = (operation, input) => {
  const spec = operations[operation]
  if (!spec) fail(`unsupported Conquest rollout operation: ${operation}`)
  exactFields(input, spec.fields)
  switch (operation) {
    case 'propose': {
      const startsAt = canonicalDate(input.startsAt, 'startsAt')
      const endsAt = canonicalDate(input.endsAt, 'endsAt')
      if (endsAt <= startsAt) fail('endsAt must be later than startsAt')
      return {
        version: version(input.version),
        startsAt,
        endsAt,
        silverCardIds: sortedUniqueCardIds(
          input.silverCardIds,
          'silverCardIds'
        ),
        goldCardIds: sortedUniqueCardIds(input.goldCardIds, 'goldCardIds'),
        reason: text(input.reason, 'reason'),
        reviewReference: text(input.reviewReference, 'reviewReference')
      }
    }
    case 'activate':
      return {
        version: version(input.version),
        cardManifest: manifest(input.cardManifest),
        reason: text(input.reason, 'reason')
      }
    case 'retire':
      return {
        version: version(input.version),
        reason: text(input.reason, 'reason')
      }
    case 'verify':
      if (!Number.isSafeInteger(input.conquestId) || input.conquestId < 1) {
        fail('conquestId must be a positive integer')
      }
      return {
        poolVersion: version(input.poolVersion, 'poolVersion'),
        conquestId: input.conquestId,
        settlementKey: receiptKey(input.settlementKey, 'settlementKey'),
        deliveryKey: receiptKey(input.deliveryKey, 'deliveryKey'),
        drillReference: text(input.drillReference, 'drillReference')
      }
  }
}

export const rolloutPlan = (operation, input) => {
  const requestBody = canonicalRolloutBody(operation, input)
  const rpcMethod = operations[operation].method
  const canonicalRequest = JSON.stringify({ rpcMethod, requestBody })
  const confirmation = `sha256:${createHash('sha256')
    .update(canonicalRequest)
    .digest('hex')}`
  return {
    mode: 'PLAN',
    operation,
    rpcMethod,
    requestBody,
    confirmation,
    operationKeyRequired: true
  }
}

const origin = value => {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    fail('CLOUD_WEASEL_OPERATOR_URL must be an explicit HTTP(S) origin')
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    fail('CLOUD_WEASEL_OPERATOR_URL must be an explicit HTTP(S) origin')
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if (parsed.protocol !== 'https:' && !local) {
    fail('CLOUD_WEASEL_OPERATOR_URL must use HTTPS except on loopback')
  }
  return parsed.origin
}

const session = value => {
  if (typeof value !== 'string' || !SESSION_PATTERN.test(value)) {
    fail('CLOUD_WEASEL_OPERATOR_SESSION is missing or malformed')
  }
  return value
}

const responseJson = async response => {
  const cacheControl = response.headers.get('cache-control') ?? ''
  if (!/(^|,)\s*no-store\s*(,|$)/i.test(cacheControl)) {
    fail('operator RPC response is missing Cache-Control: no-store')
  }
  let body
  try {
    body = await response.json()
  } catch {
    fail(`operator RPC returned non-JSON status ${response.status}`)
  }
  if (!response.ok) {
    const code = typeof body?.code === 'string' ? body.code : 'unknown'
    const message = typeof body?.msg === 'string' ? body.msg : 'request failed'
    fail(`operator RPC failed (${response.status} ${code}): ${message}`)
  }
  return body
}

export const callOperatorRpc = async ({
  baseUrl,
  sessionToken,
  method,
  body,
  operationKey,
  fetchImpl = fetch
}) => {
  const headers = {
    'content-type': 'application/json',
    cookie: `opensky_identity_session=${session(sessionToken)}`
  }
  if (operationKey !== undefined) {
    if (!UUID_PATTERN.test(operationKey)) fail('operation key must be a UUID')
    headers[OPERATION_HEADER] = operationKey.toLowerCase()
  }
  const response = await fetchImpl(`${origin(baseUrl)}${RPC_PREFIX}${method}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    redirect: 'error'
  })
  return responseJson(response)
}

export const applyRolloutPlan = async ({
  plan,
  confirmation,
  operationKey,
  baseUrl,
  sessionToken,
  fetchImpl
}) => {
  if (confirmation !== plan.confirmation) {
    fail('confirmation digest does not match the exact rollout plan')
  }
  if (typeof operationKey !== 'string' || !UUID_PATTERN.test(operationKey)) {
    fail('an explicit UUID operation key is required')
  }
  return callOperatorRpc({
    baseUrl,
    sessionToken,
    method: plan.rpcMethod,
    body: plan.requestBody,
    operationKey,
    fetchImpl
  })
}

const parseArgs = argv => {
  const [command, ...rest] = argv
  const options = new Map()
  for (let index = 0; index < rest.length; index++) {
    const key = rest[index]
    if (!key.startsWith('--')) fail(`unexpected argument: ${key}`)
    if (key === '--apply') {
      if (options.has('apply')) fail('duplicate option: --apply')
      options.set('apply', true)
      continue
    }
    const value = rest[++index]
    if (value === undefined || value.startsWith('--')) {
      fail(`missing value for ${key}`)
    }
    if (options.has(key.slice(2))) fail(`duplicate option: ${key}`)
    options.set(key.slice(2), value)
  }
  return { command, options }
}

const usage = `Usage:
  node utils/cloudflare-conquest-rollout.mjs list-pools [--version VERSION]
  node utils/cloudflare-conquest-rollout.mjs list-readiness [--version VERSION]
  node utils/cloudflare-conquest-rollout.mjs propose|activate|retire|verify --input FILE
  node utils/cloudflare-conquest-rollout.mjs propose|activate|retire|verify --input FILE --apply --operation-key UUID --confirm SHA256

Reads and writes require CLOUD_WEASEL_OPERATOR_URL and
CLOUD_WEASEL_OPERATOR_SESSION. Mutations print a deterministic plan by default;
--apply requires the exact printed confirmation digest.`

export const runConquestRolloutCli = async (
  argv,
  env = process.env,
  dependencies = {}
) => {
  const { command, options } = parseArgs(argv)
  const output = dependencies.output ?? (value => console.log(value))
  const fetchImpl = dependencies.fetchImpl ?? fetch
  const load = dependencies.readFile ?? readFile
  if (!command || command === 'help' || command === '--help') {
    output(usage)
    return
  }
  if (command === 'list-pools' || command === 'list-readiness') {
    const allowed = new Set(['version'])
    for (const key of options.keys()) {
      if (!allowed.has(key)) fail(`unexpected option for ${command}: --${key}`)
    }
    const selected = options.get('version')
    const body =
      command === 'list-pools'
        ? { ...(selected ? { version: version(selected) } : {}) }
        : { ...(selected ? { poolVersion: version(selected) } : {}) }
    const result = await callOperatorRpc({
      baseUrl: env.CLOUD_WEASEL_OPERATOR_URL,
      sessionToken: env.CLOUD_WEASEL_OPERATOR_SESSION,
      method:
        command === 'list-pools'
          ? 'GMListConquestRewardPools'
          : 'GMListConquestReadiness',
      body,
      fetchImpl
    })
    output(JSON.stringify(result, null, 2))
    return
  }
  if (!operations[command]) fail(`unknown command: ${command}\n${usage}`)
  const allowed = new Set(['input', 'apply', 'operation-key', 'confirm'])
  for (const key of options.keys()) {
    if (!allowed.has(key)) fail(`unexpected option for ${command}: --${key}`)
  }
  const inputPath = options.get('input')
  if (!inputPath) fail(`--input is required for ${command}`)
  let input
  try {
    const source = await load(inputPath, 'utf8')
    if (new TextEncoder().encode(source).byteLength > MAX_INPUT_BYTES) {
      fail(`rollout input exceeds ${MAX_INPUT_BYTES} bytes`)
    }
    input = JSON.parse(source)
  } catch (error) {
    fail(
      error instanceof SyntaxError
        ? `rollout input is not valid JSON: ${error.message}`
        : `could not read rollout input: ${error.message}`
    )
  }
  const plan = rolloutPlan(command, input)
  if (!options.get('apply')) {
    if (options.has('operation-key') || options.has('confirm')) {
      fail('--operation-key and --confirm are accepted only with --apply')
    }
    output(JSON.stringify(plan, null, 2))
    return
  }
  const result = await applyRolloutPlan({
    plan,
    confirmation: options.get('confirm'),
    operationKey: options.get('operation-key'),
    baseUrl: env.CLOUD_WEASEL_OPERATOR_URL,
    sessionToken: env.CLOUD_WEASEL_OPERATOR_SESSION,
    fetchImpl
  })
  output(
    JSON.stringify(
      {
        mode: 'APPLIED',
        operation: command,
        operationKey: options.get('operation-key').toLowerCase(),
        confirmation: plan.confirmation,
        response: result
      },
      null,
      2
    )
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runConquestRolloutCli(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
