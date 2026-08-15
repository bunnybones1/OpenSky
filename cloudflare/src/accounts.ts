import type { Account, AccountRegistration } from '@opensky/proto'

import { sourceAccountWire } from './account-wire'
import { invalidArgument } from './errors'

const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i
const NAME_PATTERN = /^[\w.-]+$/

interface AccountRow {
  id: number
  address: string
  name: string
  locale: string
  tag_art_id: string | null
  invited_by: string | null
  is_burner_wallet: number
  created_at: string
  updated_at: string
}

const toAccount = (row: AccountRow): Account =>
  sourceAccountWire({
    id: row.id,
    address: row.address,
    name: row.name,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    experience: 0,
    warmUps: 0,
    level: 0,
    seasonLevel: 0,
    levelUpXP: 0,
    tagArtID: row.tag_art_id || undefined,
    invitedBy: row.invited_by || undefined,
    isBurnerWallet: row.is_burner_wallet === 1,
    settings: {
      hidePlayerNames: false,
      suspended: false,
      requestMoreInvites: false,
      starterDeckV2Migration: true,
      burnerAddress: row.is_burner_wallet === 1 ? row.address : undefined
    }
  })

const selectAccount = `
  SELECT id, address, name, locale, tag_art_id, invited_by,
         is_burner_wallet, created_at, updated_at
  FROM accounts
`

export class AccountsRepository {
  constructor(private readonly database: D1Database) {}

  async findByAddress(address: string): Promise<Account | undefined> {
    const row = await this.database
      .prepare(`${selectAccount} WHERE address = ? COLLATE NOCASE`)
      .bind(address)
      .first<AccountRow>()
    return row ? toAccount(row) : undefined
  }

  async findByName(name: string): Promise<Account | undefined> {
    const row = await this.database
      .prepare(`${selectAccount} WHERE name = ? COLLATE NOCASE`)
      .bind(name)
      .first<AccountRow>()
    return row ? toAccount(row) : undefined
  }

  async register(
    address: string,
    registration: AccountRegistration
  ): Promise<Account> {
    const normalizedAddress = address.toLowerCase()
    if (!ADDRESS_PATTERN.test(normalizedAddress))
      throw invalidArgument('invalid wallet address')

    const existing = await this.findByAddress(normalizedAddress)
    if (existing) return existing

    const name =
      registration.name?.trim() || (await this.generateName(normalizedAddress))
    if (name.length < 4 || name.length > 20 || !NAME_PATTERN.test(name)) {
      throw invalidArgument(
        'account name must be 4-20 letters, digits, dots, dashes, or underscores'
      )
    }
    if (await this.findByName(name))
      throw invalidArgument('account username is taken')
    const identityName = await this.database
      .prepare(
        `SELECT 1 FROM player_account_settings WHERE name = ? COLLATE NOCASE`
      )
      .bind(name)
      .first()
    if (identityName) throw invalidArgument('account username is taken')

    const locale = registration.locale?.trim().slice(0, 16) || 'en'
    const tagArtID = registration.tagArtID?.trim() || null
    if (tagArtID && (!/^[\w-]+$/.test(tagArtID) || tagArtID.length > 20)) {
      throw invalidArgument('account art is invalid')
    }

    const now = new Date().toISOString()
    try {
      await this.database
        .prepare(
          `INSERT INTO accounts
             (address, name, locale, tag_art_id, invited_by, is_burner_wallet, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          normalizedAddress,
          name,
          locale,
          tagArtID,
          registration.invitedBy?.toLowerCase() || null,
          registration.isBurnerWallet ? 1 : 0,
          now,
          now
        )
        .run()
    } catch (error) {
      const concurrentlyCreated = await this.findByAddress(normalizedAddress)
      if (concurrentlyCreated) return concurrentlyCreated
      if (String(error).toLowerCase().includes('unique')) {
        throw invalidArgument('account username is taken')
      }
      throw error
    }

    const account = await this.findByAddress(normalizedAddress)
    if (!account) throw new Error('account was not persisted')
    return account
  }

  private async generateName(address: string): Promise<string> {
    for (let length = 5; length <= 20 - 'OpenSky_'.length; length += 1) {
      const candidate = `OpenSky_${address.slice(2, 2 + length)}`
      if (!(await this.findByName(candidate))) return candidate
    }
    throw new Error('unable to generate a unique account name')
  }
}
