import { webcrypto } from 'node:crypto'

const baseUrl = process.argv[2] || 'http://127.0.0.1:8787'
const signingKey = process.env.SESSION_SIGNING_KEY
if (!signingKey) throw new Error('SESSION_SIGNING_KEY is required')

const address = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
const encoder = new TextEncoder()

const base64Url = (value) =>
  Buffer.from(typeof value === 'string' ? encoder.encode(value) : value)
    .toString('base64url')

const now = Math.floor(Date.now() / 1000)
const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const payload = base64Url(
  JSON.stringify({ account: address, app: 'OpenSky', iat: now, exp: now + 3600 })
)
const unsigned = `${header}.${payload}`
const key = await webcrypto.subtle.importKey(
  'raw',
  encoder.encode(signingKey),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
)
const signature = await webcrypto.subtle.sign('HMAC', key, encoder.encode(unsigned))
const token = `${unsigned}.${base64Url(new Uint8Array(signature))}`

const rpc = async (method, body, authenticated = false) => {
  const response = await fetch(`${baseUrl}/api/rpc/SkyWeaverAPI/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
      ...(authenticated ? { Authorization: `BEARER ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  const result = await response.json()
  return { status: response.status, result }
}

const fakeProof = `eth.${address}.${base64Url(
  JSON.stringify({ app: 'OpenSky', iat: now, exp: now + 3600, ogn: baseUrl, v: '1' })
)}.0xdeadbeef`
const rejectedProof = await rpc('GetAuthToken', { ethAuthProofString: fakeProof })
if (rejectedProof.status !== 403) {
  throw new Error(`invalid proof returned ${rejectedProof.status}`)
}

const registration = await rpc(
  'RegisterAccount',
  { accountRegistration: { address, locale: 'en', tagArtID: 'cloud-bg' }, captcha: '' },
  true
)
if (registration.status !== 200 || registration.result.account?.address !== address) {
  throw new Error('account registration failed')
}

const session = await rpc('GetSession', {}, true)
if (session.status !== 200 || session.result.account?.address !== address) {
  throw new Error('session restoration failed')
}

const savedPolicy = await rpc(
  'SaveCookiePolicy',
  { cookieOptions: { PRODUCT_ANALYTICS: true } },
  true
)
if (savedPolicy.status !== 200 || savedPolicy.result.status !== true) {
  throw new Error('cookie policy save failed')
}

const policy = await rpc('GetCookiePolicy', {}, true)
if (policy.status !== 200 || policy.result.res?.PRODUCT_ANALYTICS !== true) {
  throw new Error('cookie policy restoration failed')
}

console.log(
  JSON.stringify({
    invalidProofStatus: rejectedProof.status,
    account: registration.result.account.name,
    sessionAddress: session.result.address,
    productAnalytics: policy.result.res.PRODUCT_ANALYTICS
  })
)
