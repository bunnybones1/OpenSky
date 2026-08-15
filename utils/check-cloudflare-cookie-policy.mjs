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

const compact = source => source.replace(/\s+/g, ' ')

const enumValues = generatedSource => {
  const body = generatedSource.match(
    /var CookiePolicyOption_value = map\[string\]uint16\{([\s\S]*?)\n\}/
  )?.[1]
  return body
    ? [...body.matchAll(/^\s*"([A-Z_]+)":\s+\d+,?$/gm)].map(match => match[1])
    : []
}

export const cookiePolicyErrors = (
  generatedSource,
  handlerSource,
  integrationSource,
  defaultsSource,
  accessSource,
  errorsSource,
  repositorySource,
  apiSource,
  workerTestSource,
  packageSource
) => {
  const errors = []
  const expectedOptions = [
    'AUTHENTICATION',
    'MARKETPLACE',
    'GEO_BLOCKING',
    'PRODUCT_ANALYTICS'
  ]
  if (
    JSON.stringify(enumValues(generatedSource)) !==
    JSON.stringify(expectedOptions)
  ) {
    errors.push('source CookiePolicyOption enum changed')
  }

  const generatedSave = compact(
    section(
      generatedSource,
      'func (s *skyWeaverAPIServer) serveSaveCookiePolicyJSON(',
      'func (s *skyWeaverAPIServer) serveGetCookiePolicy('
    )
  )
  const integration = compact(integrationSource)
  for (const token of [
    'Arg0 map[string]bool `json:"cookieOptions"`',
    'ret0, err = s.SkyWeaverAPI.SaveCookiePolicy(ctx, reqContent.Arg0)'
  ]) {
    if (!generatedSave.includes(token)) {
      errors.push(`generated SaveCookiePolicy request changed: ${token}`)
    }
  }

  const defaults = compact(defaultsSource)
  for (const token of [
    'CookiePolicyOption_AUTHENTICATION)]: true',
    'CookiePolicyOption_GEO_BLOCKING)]: true',
    'CookiePolicyOption_MARKETPLACE)]: true',
    'CookiePolicyOption_PRODUCT_ANALYTICS)]: false'
  ]) {
    if (!defaults.includes(token)) {
      errors.push(`source cookie-policy default changed: ${token}`)
    }
  }

  const saveHandler = compact(
    section(
      handlerSource,
      'func (s *Server) SaveCookiePolicy(',
      'func (s *Server) GetCookiePolicy('
    )
  )
  for (const token of [
    'account, ok := rctx.CurrentAccount(ctx)',
    'policies := data.DefaultCookiePolicies()',
    'for k, v := range cookieOptions',
    '_, ok := proto.CookiePolicyOption_value[k]',
    'proto.Errorf(proto.ErrUnknown, "Unknown cookie policy %s", k)',
    'if isModifiablePolicy(k)',
    'policies[k] = v',
    'return true, nil'
  ]) {
    if (!saveHandler.includes(token)) {
      errors.push(`source SaveCookiePolicy handler changed: ${token}`)
    }
  }
  if (
    !compact(handlerSource).includes(
      'return policy == proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_PRODUCT_ANALYTICS)]'
    )
  ) {
    errors.push('source modifiable cookie-policy option changed')
  }

  const access = compact(accessSource)
  for (const token of [
    '"SaveCookiePolicy": {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin}',
    '"GetCookiePolicy": {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin}'
  ]) {
    if (!access.includes(token)) {
      errors.push(`source cookie-policy access changed: ${token}`)
    }
  }
  const accessSection = section(
    accessSource,
    '// Cookie policy',
    '// Social Info'
  )
  if (
    accessSection.includes('SessionTypePublic') ||
    accessSection.includes('SessionTypeService')
  ) {
    errors.push(
      'source cookie-policy access unexpectedly became public/service'
    )
  }

  for (const token of [
    't.Run("save defaults"',
    'SaveCookiePolicy(ctx, map[string]bool{})',
    't.Run("non modifiable options"',
    'CookiePolicyOption_AUTHENTICATION.String(): false',
    't.Run("invalid policies"',
    '"does_not_exist": true',
    'assert.Error(t, err)',
    'assert.False(t, status)'
  ]) {
    if (!integration.includes(token)) {
      errors.push(`source cookie-policy integration proof changed: ${token}`)
    }
  }

  if (!errorsSource.includes("new RpcError(400, 'webrpc.unknown', message)")) {
    errors.push('Worker lost the source unknown-error code')
  }

  const repository = compact(repositorySource)
  for (const option of expectedOptions) {
    if (!repository.includes(`'${option}'`)) {
      errors.push(`Worker cookie-policy option set lost ${option}`)
    }
  }
  for (const token of [
    'value === undefined || value === null',
    "typeof value !== 'object' || Array.isArray(value)",
    "throw invalidArgument('failed to unmarshal cookieOptions')",
    'if (!SOURCE_COOKIE_POLICY_OPTIONS.has(name))',
    'throw unknown(`Unknown cookie policy ${name}`)',
    "typeof enabled !== 'boolean'",
    'AUTHENTICATION: true',
    'PRODUCT_ANALYTICS: options.PRODUCT_ANALYTICS === true'
  ]) {
    if (!repository.includes(token)) {
      errors.push(`Worker cookie-policy contract changed: ${token}`)
    }
  }

  const getRoute = compact(
    section(apiSource, "case 'GetCookiePolicy':", "case 'SaveCookiePolicy':")
  )
  if (
    !getRoute.includes('const principal = await rpcPrincipal(request, env)')
  ) {
    errors.push('GetCookiePolicy lost its source authentication boundary')
  }
  const saveRoute = compact(
    section(apiSource, "case 'SaveCookiePolicy':", "case 'GetDiscordInfo':")
  )
  for (const token of [
    'const principal = await rpcPrincipal(request, env)',
    'const body = await requestBody<unknown>(request)',
    'const cookieOptions = sourceCookiePolicyOptions(',
    'await cookiePolicies.save( principal.reference, cookieOptions, principal.kind )'
  ]) {
    if (!saveRoute.includes(token)) {
      errors.push(`Worker SaveCookiePolicy route changed: ${token}`)
    }
  }
  if (
    saveRoute.indexOf('sourceCookiePolicyOptions(') >
    saveRoute.indexOf('cookiePolicies.save(')
  ) {
    errors.push('Worker validates cookie options after the repository write')
  }

  for (const token of [
    "code: 'webrpc.unknown'",
    "msg: 'Unknown cookie policy DOES_NOT_EXIST'",
    "code: 'webrpc.invalid_argument'",
    'cookieOptions: null',
    'SELECT policy, updated_at FROM cookie_policies',
    ').toEqual(beforeInvalid)',
    'SELECT COUNT(*) AS count FROM cookie_policies'
  ]) {
    if (!workerTestSource.includes(token)) {
      errors.push(`Worker cookie-policy route proof changed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:cookie-policy'
    )
  ) {
    errors.push('complete Cloudflare build omits the cookie-policy gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/cookie_policy.go',
    'api/rpc/cookie_policy_integration_test.go',
    'api/data/cookie_policies_store.go',
    'api/rpc/middleware/access_control.go',
    'cloudflare/src/errors.ts',
    'cloudflare/src/cookie-policies.ts',
    'cloudflare/src/api.ts',
    'cloudflare/test/identity-cookie-policy.test.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = cookiePolicyErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cookie policies preserve source enums, defaults, access, and fail-before-write validation'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
