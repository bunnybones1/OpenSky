import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*\w+\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)]
        .map(match => ({
          type: match[1].trim(),
          json: match[2].split(',')[0],
          omitEmpty: match[2].split(',').includes('omitempty')
        }))
        .filter(field => field.json !== '-')
    : []

const exactFields = (source, name, expected, omitEmpty) => {
  const fields = jsonFields(structBody(source, name))
  return (
    JSON.stringify(fields.map(field => field.json)) ===
      JSON.stringify(expected) &&
    fields.every(field => field.omitEmpty === omitEmpty)
  )
}

const pointerFields = (source, name) =>
  jsonFields(structBody(source, name))
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)

const crystalPriorities = source => {
  const body = source.match(
    /var crystalsPriority = map\[uint64\]int\{([\s\S]*?)\n\}/
  )?.[1]
  return body
    ? [...body.matchAll(/^\s*(\d+):\s*(\d+),/gm)].map(match => [
        Number(match[1]),
        Number(match[2])
      ])
    : []
}

export const accountWireErrors = (
  source,
  authSource,
  integrationSource,
  crystalSource,
  accountWire,
  accounts,
  player,
  competitive,
  competitiveWire,
  api,
  authTest,
  proof,
  proofTest
) => {
  const errors = []
  const accountFields = [
    'id',
    'address',
    'name',
    'locale',
    'createdAt',
    'updatedAt',
    'experience',
    'warmUps',
    'level',
    'seasonLevel',
    'levelUpXP',
    'stats',
    'region',
    'tagArtID',
    'crystalID',
    'titleID',
    'settings',
    'invitedBy',
    'isBurnerWallet'
  ]
  if (!exactFields(source, 'Account', accountFields, false)) {
    errors.push('source Account JSON contract could not be derived exactly')
  }
  const nullableFields = [
    'createdAt',
    'updatedAt',
    'stats',
    'region',
    'tagArtID',
    'crystalID',
    'titleID',
    'settings',
    'invitedBy',
    'isBurnerWallet'
  ]
  if (
    JSON.stringify(pointerFields(source, 'Account')) !==
    JSON.stringify(nullableFields)
  ) {
    errors.push('source Account pointer contract changed')
  }

  const compact = value => value.replace(/\s+/g, ' ')
  const generatedAuth = compact(
    section(
      source,
      'func (s *skyWeaverAPIServer) serveGetAuthTokenJSON(',
      'func (s *skyWeaverAPIServer) serveGetSession('
    )
  )
  for (const token of [
    'Arg0 string `json:"ethAuthProofString"`',
    'Ret3 *Account `json:"account"`',
    '}{ret0, ret1, ret2, ret3}'
  ]) {
    if (!generatedAuth.includes(token)) {
      errors.push(`generated GetAuthToken account wire changed: ${token}`)
    }
  }
  const generatedSession = compact(
    section(
      source,
      'func (s *skyWeaverAPIServer) serveGetSessionJSON(',
      'func (s *skyWeaverAPIServer) serveMigrateAccount('
    )
  )
  for (const token of ['Ret1 *Account `json:"account"`', '}{ret0, ret1}']) {
    if (!generatedSession.includes(token)) {
      errors.push(`generated GetSession account wire changed: ${token}`)
    }
  }

  const sourceAuth = compact(authSource)
  for (const token of [
    'proto.WrapError(proto.ErrPermissionDenied, err, "failed to decode ethauth proof")',
    'var respAccount *proto.Account',
    'respAccount = account.Account',
    'return true, jwtString, proof.Address, respAccount, nil',
    'return walletAddress, respAccount, nil'
  ]) {
    if (!sourceAuth.includes(token)) {
      errors.push(`source auth/session account behavior changed: ${token}`)
    }
  }
  const initialAuthIntegration = compact(
    section(
      integrationSource,
      'status, ajwtToken, address, account, err = apitest.Client().GetAuthToken(',
      'adminAccountID, err = apitest.CreateRandomAdminAccount('
    )
  )
  if (!initialAuthIntegration.includes('assert.Nil(t, account)')) {
    errors.push('source pre-registration auth no longer proves a nil account')
  }
  if (
    !exactFields(
      source,
      'AccountStats',
      [
        'rankedConstructed',
        'rankedDiscovery',
        'conquestConstructed',
        'conquestDiscovery'
      ],
      true
    )
  ) {
    errors.push('source nested AccountStats omission contract changed')
  }
  if (
    !exactFields(
      source,
      'AccountSettings',
      [
        'hidePlayerNames',
        'suspended',
        'requestMoreInvites',
        'renameLockedUntil',
        'starterDeckV2Migration',
        'spectateCode',
        'spectateCodeExpiresAt',
        'twitchProfile',
        'registrationEvent',
        'titleID',
        'burnerAddress'
      ],
      true
    )
  ) {
    errors.push('source nested AccountSettings omission contract changed')
  }

  const compactWire = compact(accountWire)
  for (const field of accountFields) {
    const token = nullableFields.includes(field)
      ? `${field}: account.${field} ?? null`
      : `${field}: account.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker Account wire is missing: ${token}`)
    }
  }

  const priorities = crystalPriorities(crystalSource)
  if (
    JSON.stringify(priorities) !==
    JSON.stringify([
      [7, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [8, 5],
      [4, 6],
      [5, 7],
      [6, 8]
    ])
  ) {
    errors.push('source crystal priority contract changed')
  }
  for (const [tokenID, priority] of priorities) {
    if (!compactWire.includes(`WHEN ${tokenID} THEN ${priority}`)) {
      errors.push(
        `Worker crystal priority is missing token ${tokenID} at ${priority}`
      )
    }
  }
  for (const token of [
    "crystal.item_type = 'SW_CRYSTALS'",
    'crystal.balance > 0',
    'ORDER BY ${SOURCE_CRYSTAL_PRIORITY_SQL}, crystal.token_id'
  ]) {
    if (!accountWire.includes(token)) {
      errors.push(`Worker crystal projection is missing: ${token}`)
    }
  }

  const projections = [
    ['wallet account', accounts],
    ['identity account', player]
  ]
  for (const [name, projection] of projections) {
    if (
      !projection.includes('import { sourceAccountWire') &&
      !projection.includes('sourceAccountWire } from')
    ) {
      errors.push(`${name} projection does not import sourceAccountWire`)
    }
    if (!projection.replace(/\s+/g, ' ').includes('sourceAccountWire({')) {
      errors.push(`${name} projection bypasses sourceAccountWire`)
    }
  }
  if (
    !competitive.includes('import { sourceLeaderboardEntryWire }') ||
    !competitive.includes('return sourceLeaderboardEntryWire({')
  ) {
    errors.push('leaderboard account projection bypasses competitive wire')
  }
  if (
    !competitiveWire.includes('import { sourceAccountWire }') ||
    !competitiveWire
      .replace(/\s+/g, ' ')
      .includes(
        'account: value.account ? sourceAccountWire(value.account) : null'
      )
  ) {
    errors.push('competitive wire bypasses sourceAccountWire')
  }
  for (const [name, projection, userExpression] of [
    ['identity account', player, "sourceCrystalIDSQL('u.id')"],
    ['leaderboard account', competitive, "sourceCrystalIDSQL('stats.user_id')"]
  ]) {
    if (!projection.includes(userExpression)) {
      errors.push(`${name} projection bypasses source crystal priority`)
    }
  }
  for (const token of [
    "case 'GetAccount':",
    "case 'GetAccountByUsername':",
    "case 'ListLeaderboard':"
  ]) {
    if (!api.includes(token)) {
      errors.push(`main Worker Account boundary is missing: ${token}`)
    }
  }
  const workerAuth = compact(
    section(api, "case 'GetAuthToken':", "case 'GetSession':")
  )
  for (const token of [
    'const body = await requestBody<unknown>(request)',
    "const proofString = sourceStringArgument(body, 'ethAuthProofString')",
    'services.verifyProof( proofString,'
  ]) {
    if (!workerAuth.includes(token)) {
      errors.push(`GetAuthToken source decode boundary changed: ${token}`)
    }
  }
  if (!workerAuth.includes('account: account ?? null')) {
    errors.push('GetAuthToken does not preserve the generated null account')
  }
  const workerStringArgument = compact(
    section(api, 'const sourceStringArgument =', 'const walletPrincipal =')
  )
  for (const token of [
    "if (body === null) return ''",
    "if (typeof body !== 'object' || Array.isArray(body))",
    "throw invalidArgument('failed to unmarshal request data')",
    "if (value === undefined || value === null) return ''",
    "if (typeof value !== 'string')",
    'return value'
  ]) {
    if (!workerStringArgument.includes(token)) {
      errors.push(`source string argument decoder changed: ${token}`)
    }
  }
  const compactProof = compact(proof)
  for (const token of [
    "throw permissionDenied('invalid ethauth proof')",
    "throw permissionDenied('invalid wallet address')",
    "throw permissionDenied('invalid ethauth claims')",
    "throw permissionDenied('incomplete ethauth claims')",
    '!Number.isSafeInteger(rawClaims.exp)',
    "typeof rawClaims.iat !== 'number'",
    "typeof rawClaims.ogn !== 'string'",
    "throw invalidArgument('ethauth proof origin does not match the request')"
  ]) {
    if (!compactProof.includes(token)) {
      errors.push(`wallet-proof error mapping changed: ${token}`)
    }
  }
  const workerSession = compact(
    section(api, "case 'GetSession':", "case 'Ping':")
  )
  if (!workerSession.includes('account: account ?? null')) {
    errors.push('GetSession does not preserve the generated null account')
  }
  const compactAuthTest = compact(authTest)
  for (const token of [
    'expect(body).toMatchObject({ status: true, address, account: null })',
    'expect(await session.json()).toEqual({ address, account: null })',
    'passes omitted and null proof values to the source decoder as an empty string',
    "expect(verifyProof).toHaveBeenCalledWith('', null, env.SEQUENCE_API_HOST)",
    'rejects non-string proof input as a generated decode error',
    "code: 'webrpc.permission_denied'",
    "code: 'webrpc.invalid_argument'",
    'expect(verifyProof).not.toHaveBeenCalled()'
  ]) {
    if (!compactAuthTest.includes(token)) {
      errors.push(`auth/session null-account proof changed: ${token}`)
    }
  }
  const compactProofTest = compact(proofTest)
  for (const token of [
    'maps malformed proof and claim decoding to source permission-denied errors',
    "status: 403, code: 'webrpc.permission_denied'",
    'expect(originError).toBeInstanceOf(RpcError)',
    "status: 400, code: 'webrpc.invalid_argument'"
  ]) {
    if (!compactProofTest.includes(token)) {
      errors.push(`wallet-proof regression proof changed: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    source,
    authSource,
    integrationSource,
    crystalSource,
    accountWire,
    accounts,
    player,
    competitive,
    competitiveWire,
    api,
    authTest,
    proof,
    proofTest
  ] = await Promise.all([
    readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
    readFile(path.join(root, 'api', 'rpc', 'auth.go'), 'utf8'),
    readFile(
      path.join(root, 'api', 'rpc', 'accounts_integration_test.go'),
      'utf8'
    ),
    readFile(path.join(root, 'api', 'data', 'crystal.go'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'account-wire.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'accounts.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'player-rpc.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'competitive.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'competitive-wire.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'test', 'auth-api.test.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'proof.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'test', 'proof.test.ts'), 'utf8')
  ])
  const errors = accountWireErrors(
    source,
    authSource,
    integrationSource,
    crystalSource,
    accountWire,
    accounts,
    player,
    competitive,
    competitiveWire,
    api,
    authTest,
    proof,
    proofTest
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Account, auth/session, and wallet-proof boundaries preserve generated Go behavior'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
