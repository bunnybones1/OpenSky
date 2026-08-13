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
