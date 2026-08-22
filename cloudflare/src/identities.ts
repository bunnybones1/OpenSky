export interface IdentityUser {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
}

export interface GoogleIdentityProfile {
  subject: string
  displayName: string
  email: string
  emailVerified: boolean
  avatarUrl?: string
}

export interface WalletConnection {
  namespace: string
  address: string
  source: string
  label?: string
  verifiedAt: string
}

export const providerSubjectHash = async (
  provider: string,
  subject: string
): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${provider}\u0000${subject}`)
  )
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

interface UserRow {
  id: string
  display_name: string
  primary_email: string
  avatar_url: string | null
}

interface WalletConnectionRow {
  namespace: string
  address: string
  source: string
  label: string | null
  verified_at: string
}

const toUser = (row: UserRow): IdentityUser => ({
  id: row.id,
  displayName: row.display_name,
  email: row.primary_email,
  ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {})
})

const userSelect = `
  SELECT id, display_name, primary_email, avatar_url
  FROM users
`

export class IdentitiesRepository {
  constructor(private readonly database: D1Database) {}

  async findUserById(id: string): Promise<IdentityUser | undefined> {
    const row = await this.database
      .prepare(`${userSelect} WHERE id = ?`)
      .bind(id)
      .first<UserRow>()
    return row ? toUser(row) : undefined
  }

  async findUserByIdentity(
    provider: string,
    subject: string
  ): Promise<IdentityUser | undefined> {
    const row = await this.database
      .prepare(
        `${userSelect}
         WHERE id = (
           SELECT user_id FROM auth_identities
           WHERE provider = ? AND provider_subject = ?
         )`
      )
      .bind(provider, subject)
      .first<UserRow>()
    return row ? toUser(row) : undefined
  }

  async findProviderSubject(
    userId: string,
    provider: string
  ): Promise<string | undefined> {
    const row = await this.database
      .prepare(
        `SELECT provider_subject FROM auth_identities
         WHERE user_id = ? AND provider = ?`
      )
      .bind(userId, provider)
      .first<{ provider_subject: string }>()
    return row?.provider_subject
  }

  async upsertGoogle(profile: GoogleIdentityProfile): Promise<IdentityUser> {
    if (!profile.subject || profile.subject.length > 255) {
      throw new Error('Google identity subject is invalid')
    }
    if (!profile.emailVerified || !profile.email.includes('@')) {
      throw new Error('Google account does not have a verified email')
    }

    const email = profile.email.trim().toLowerCase().slice(0, 320)
    const displayName = (profile.displayName.trim() || email.split('@')[0]).slice(0, 120)
    const avatarUrl = profile.avatarUrl?.startsWith('https://')
      ? profile.avatarUrl.slice(0, 2048)
      : null
    const now = new Date().toISOString()
    const tombstone = await this.database
      .prepare(
        `SELECT 1 FROM identity_provider_tombstones
         WHERE provider = 'google' AND provider_subject_hash = ?`
      )
      .bind(await providerSubjectHash('google', profile.subject))
      .first()
    if (tombstone) throw new Error('Google identity was deleted')
    const existing = await this.findUserByIdentity('google', profile.subject)

    if (existing) {
      const status = await this.database
        .prepare(
          `SELECT account_status FROM player_account_settings WHERE user_id = ?`
        )
        .bind(existing.id)
        .first<{ account_status: string }>()
      if (status && ['TO_DELETE', 'DELETED'].includes(status.account_status)) {
        throw new Error('Google identity is pending deletion')
      }
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE users
             SET display_name = ?, primary_email = ?, avatar_url = ?, updated_at = ?
             WHERE id = ?`
          )
          .bind(displayName, email, avatarUrl, now, existing.id),
        this.database
          .prepare(
            `UPDATE auth_identities
             SET email = ?, email_verified = 1, updated_at = ?
             WHERE provider = 'google' AND provider_subject = ?`
          )
          .bind(email, now, profile.subject)
      ])
      return (await this.findUserById(existing.id)) || existing
    }

    const userId = crypto.randomUUID()
    try {
      await this.database.batch([
        this.database
          .prepare(
            `INSERT INTO users
               (id, display_name, primary_email, avatar_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(userId, displayName, email, avatarUrl, now, now),
        this.database
          .prepare(
            `INSERT INTO auth_identities
               (provider, provider_subject, user_id, email, email_verified, created_at, updated_at)
             VALUES ('google', ?, ?, ?, 1, ?, ?)`
          )
          .bind(profile.subject, userId, email, now, now)
      ])
    } catch (error) {
      const concurrentlyCreated = await this.findUserByIdentity('google', profile.subject)
      if (concurrentlyCreated) return concurrentlyCreated
      throw error
    }

    const user = await this.findUserById(userId)
    if (!user) throw new Error('identity user was not persisted')
    return user
  }

  async listWallets(userId: string): Promise<WalletConnection[]> {
    const { results } = await this.database
      .prepare(
        `SELECT namespace, address, source, label, verified_at
         FROM wallet_connections
         WHERE user_id = ?
         ORDER BY verified_at ASC`
      )
      .bind(userId)
      .all<WalletConnectionRow>()
    return results.map((row) => ({
      namespace: row.namespace,
      address: row.address,
      source: row.source,
      ...(row.label ? { label: row.label } : {}),
      verifiedAt: row.verified_at
    }))
  }
}
