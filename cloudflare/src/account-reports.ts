import { invalidArgument } from './errors'
import { identityReferenceFor } from './rpc-principal'

export interface SourceReportInput {
  reportedAddress?: unknown
  matchId?: unknown
  reporterComment?: unknown
}

export interface SourceReportRequest {
  reportedAddress: string
  matchId: number
  reporterComment: string
}

interface MatchParticipants {
  player1_user_id: string | null
  player2_user_id: string | null
  player1_principal: string
  player2_principal: string
}

const SKIP_CONTENT_TAG =
  /<(?:frame|frameset|iframe|noembed|noframes|noscript|nostyle|object|script|style|title)\b[^>]*>[\s\S]*?<\/(?:frame|frameset|iframe|noembed|noframes|noscript|nostyle|object|script|style|title)\s*>/gi
const HTML_COMMENT = /<!--([\s\S]*?)-->/g
const HTML_TAG = /<[^>]*>/g
const ENTITY: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: '\u00a0',
  quot: '"'
}

// StrictPolicy removes tags while retaining ordinary element text. This
// dependency-free equivalent also strips the content of active/embed tags.
export const sanitizeReportComment = (input: string): string =>
  input
    .replace(HTML_COMMENT, '')
    .replace(SKIP_CONTENT_TAG, '')
    .replace(HTML_TAG, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (value, entity: string) => {
      const normalized = entity.toLowerCase()
      if (normalized.startsWith('#x')) {
        const codePoint = Number.parseInt(normalized.slice(2), 16)
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : value
      }
      if (normalized.startsWith('#')) {
        const codePoint = Number.parseInt(normalized.slice(1), 10)
        return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : value
      }
      return ENTITY[normalized] ?? value
    })

const truncateUtf8 = (value: string, bytes: number) => {
  const encoded = new TextEncoder().encode(value)
  if (encoded.byteLength <= bytes) return value
  return new TextDecoder('utf-8', { fatal: false })
    .decode(encoded.slice(0, bytes))
    .replace(/\uFFFD$/, '')
}

/** Recreates encoding/json zero values for the generated Go Report request. */
export const sourceReportRequest = (
  input: SourceReportInput
): SourceReportRequest => {
  if (
    (input.reportedAddress != null &&
      typeof input.reportedAddress !== 'string') ||
    (input.matchId != null &&
      (typeof input.matchId !== 'number' ||
        !Number.isSafeInteger(input.matchId) ||
        input.matchId < 0)) ||
    (input.reporterComment != null && typeof input.reporterComment !== 'string')
  ) {
    throw invalidArgument('missing report data')
  }
  return {
    reportedAddress: input.reportedAddress ?? '',
    matchId: input.matchId ?? 0,
    reporterComment: input.reporterComment ?? ''
  }
}

export class AccountReportsRepository {
  constructor(private readonly database: D1Database) {}

  async report(
    reporterUserId: string,
    input: SourceReportInput
  ): Promise<boolean> {
    const report = sourceReportRequest(input)
    if (report.matchId <= 0) {
      throw invalidArgument('failed to fetch reported match')
    }

    const match = await this.database
      .prepare(
        `SELECT player1_user_id, player2_user_id,
                player1_principal, player2_principal
         FROM multiplayer_matches WHERE id = ?`
      )
      .bind(report.matchId)
      .first<MatchParticipants>()
    if (!match) throw invalidArgument('failed to fetch reported match')
    const reporterPlayer =
      match.player1_user_id === reporterUserId
        ? 0
        : match.player2_user_id === reporterUserId
          ? 1
          : undefined
    const normalizedReportedAddress = report.reportedAddress.toLowerCase()
    const reporterAddress = identityReferenceFor(reporterUserId)
    const reporterPrincipal =
      reporterPlayer === 0
        ? match.player1_principal
        : reporterPlayer === 1
          ? match.player2_principal
          : undefined
    if (
      report.reportedAddress === reporterAddress ||
      (reporterPrincipal &&
        normalizedReportedAddress === reporterPrincipal.toLowerCase())
    ) {
      throw invalidArgument('reporting yourself? cute.')
    }
    if (reporterPlayer === undefined) {
      throw invalidArgument(
        'you can only send reports about matches you participaded in'
      )
    }
    const principalUserId =
      normalizedReportedAddress === match.player1_principal.toLowerCase()
        ? match.player1_user_id
        : normalizedReportedAddress === match.player2_principal.toLowerCase()
          ? match.player2_user_id
          : null
    const reportedUserId = report.reportedAddress.startsWith('identity:')
      ? report.reportedAddress.slice('identity:'.length)
      : principalUserId
    if (!reportedUserId) throw invalidArgument('account does not exist')
    const reportedAccount = await this.database
      .prepare('SELECT 1 FROM users WHERE id = ?')
      .bind(reportedUserId)
      .first()
    if (!reportedAccount) throw invalidArgument('account does not exist')
    const opponentUserId =
      reporterPlayer === 0 ? match.player2_user_id : match.player1_user_id
    if (opponentUserId !== reportedUserId) {
      throw invalidArgument(
        'you can only send reports about your opponent in a match'
      )
    }

    const now = new Date().toISOString()
    const comment = truncateUtf8(
      sanitizeReportComment(report.reporterComment),
      4000
    )
    await this.database
      .prepare(
        `INSERT INTO player_account_reports
           (match_id, reported_user_id, reporter_user_id, comment,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(match_id, reporter_user_id) DO NOTHING`
      )
      .bind(report.matchId, reportedUserId, reporterUserId, comment, now, now)
      .run()
    return true
  }
}
