import { invalidArgument, unknown } from './errors'

const SOURCE_COOKIE_POLICY_OPTIONS = new Set([
  'AUTHENTICATION',
  'MARKETPLACE',
  'GEO_BLOCKING',
  'PRODUCT_ANALYTICS'
])

const LEGACY_DEFAULT_POLICY: Record<string, boolean> = {
  AUTHENTICATION: true,
  GEO_BLOCKING: true,
  MARKETPLACE: true,
  PRODUCT_ANALYTICS: false
}

const identityPolicy = (options: Record<string, boolean>) => ({
  AUTHENTICATION: true,
  PRODUCT_ANALYTICS: options.PRODUCT_ANALYTICS === true
})

export const sourceCookiePolicyOptions = (
  value: unknown
): Record<string, boolean> => {
  // The generated Go request decodes an omitted or null map to nil, and the
  // handler treats that exactly like an empty map by restoring its defaults.
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw invalidArgument('failed to unmarshal cookieOptions')
  }

  const options: Record<string, boolean> = {}
  for (const [name, enabled] of Object.entries(value)) {
    if (!SOURCE_COOKIE_POLICY_OPTIONS.has(name)) {
      throw unknown(`Unknown cookie policy ${name}`)
    }
    if (typeof enabled !== 'boolean') {
      throw invalidArgument('failed to unmarshal cookieOptions')
    }
    options[name] = enabled
  }
  return options
}

interface CookiePolicyRow {
  policy: string
}

export class CookiePoliciesRepository {
  constructor(private readonly database: D1Database) {}

  async get(address: string): Promise<Record<string, boolean>> {
    const row = await this.database
      .prepare('SELECT policy FROM cookie_policies WHERE account_address = ? COLLATE NOCASE')
      .bind(address)
      .first<CookiePolicyRow>()

    if (!row) return {}

    try {
      return JSON.parse(row.policy) as Record<string, boolean>
    } catch {
      return {}
    }
  }

  async save(
    address: string,
    options: Record<string, boolean>,
    principalKind: 'identity' | 'wallet'
  ): Promise<void> {
    const policy =
      principalKind === 'identity'
        ? identityPolicy(options)
        : {
            ...LEGACY_DEFAULT_POLICY,
            PRODUCT_ANALYTICS: options.PRODUCT_ANALYTICS === true
          }
    const updatedAt = new Date().toISOString()

    await this.database
      .prepare(
        `INSERT INTO cookie_policies (account_address, policy, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(account_address) DO UPDATE SET
           policy = excluded.policy,
           updated_at = excluded.updated_at`
      )
      .bind(address, JSON.stringify(policy), updatedAt)
      .run()
  }
}
