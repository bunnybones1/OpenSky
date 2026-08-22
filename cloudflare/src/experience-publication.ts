const INVALID_EXPERIENCE_PROJECTION =
  'unpublished match experience receipt is invalid'
const ABSENT_SEASON_STATS = -2

type ExperienceSnapshotField =
  | 'before_level'
  | 'before_xp'
  | 'before_skypass_level'
  | 'before_skypass_xp'
  | 'profile_updated_at_before'

const validReceiptSQL = (
  receipt: string,
  match: string
): string => `${receipt}.user_id = CASE ${receipt}.player_index
  WHEN 0 THEN ${match}.player1_user_id
  ELSE ${match}.player2_user_id
END
AND ${receipt}.before_level >= 1
AND ${receipt}.before_xp BETWEEN 0 AND 199
AND ${receipt}.before_skypass_level >= 1
AND ${receipt}.before_skypass_xp BETWEEN 0 AND 199
AND ${receipt}.profile_updated_at_before <> ''
AND ${receipt}.experience_gain >= 0
AND ${receipt}.after_level = ${receipt}.before_level
  + CAST((${receipt}.before_xp + ${receipt}.experience_gain) / 200 AS INTEGER)
AND ${receipt}.after_xp =
  (${receipt}.before_xp + ${receipt}.experience_gain) % 200
AND (
  (${receipt}.season_stats_existed_before = 0
    AND ${receipt}.season_initial_account_level_before = -1
    AND ${receipt}.season_achieved_account_level_before = -1)
  OR
  (${receipt}.season_stats_existed_before = 1
    AND ${receipt}.season_initial_account_level_before >= 0
    AND ${receipt}.season_achieved_account_level_before
      >= ${receipt}.season_initial_account_level_before)
)
AND ${receipt}.inviter_sticker_points_existed_before IN (0, 1)
AND (
  (${receipt}.inviter_sticker_points_existed_before = 0
    AND ${receipt}.inviter_sticker_points_created_at_before = ''
    AND ${receipt}.inviter_sticker_points_updated_at_before = '')
  OR
  (${receipt}.inviter_sticker_points_existed_before = 1
    AND ${receipt}.inviter_user_id IS NOT NULL
    AND ${receipt}.inviter_sticker_points_created_at_before <> ''
    AND ${receipt}.inviter_sticker_points_updated_at_before <> '')
)
AND (
  ${receipt}.inviter_user_id IS NOT NULL
  OR (${receipt}.inviter_sticker_points_existed_before = 0
    AND ${receipt}.inviter_sticker_points_before = 0)
)`

const publishedSnapshotSQL = (
  field: ExperienceSnapshotField,
  userIdExpression: string,
  rawExpression: string
): string => `COALESCE((
  SELECT CASE
    WHEN ${validReceiptSQL('pending_experience', 'pending_match')}
      THEN pending_experience.${field}
    ELSE -1
  END
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.user_id = ${userIdExpression}
    AND pending_match.status <> 'ended'
  ORDER BY pending_experience.rowid ASC
  LIMIT 1
), ${rawExpression}, -1)`

/**
 * Source-visible account/progression values while a retryable match completion
 * is staged but its terminal ledger row is not yet published.
 *
 * Expressions are trusted static column references supplied by repositories.
 */
export const publishedAccountLevelSQL = (
  userIdExpression: string,
  rawExpression: string
): string =>
  publishedSnapshotSQL('before_level', userIdExpression, rawExpression)

export const publishedAccountXpSQL = (
  userIdExpression: string,
  rawExpression: string
): string => publishedSnapshotSQL('before_xp', userIdExpression, rawExpression)

export const publishedSkypassLevelSQL = (
  userIdExpression: string,
  rawExpression: string
): string =>
  publishedSnapshotSQL('before_skypass_level', userIdExpression, rawExpression)

export const publishedSkypassXpSQL = (
  userIdExpression: string,
  rawExpression: string
): string =>
  publishedSnapshotSQL('before_skypass_xp', userIdExpression, rawExpression)

export const publishedProfileUpdatedAtSQL = (
  userIdExpression: string,
  rawExpression: string
): string =>
  publishedSnapshotSQL(
    'profile_updated_at_before',
    userIdExpression,
    rawExpression
  )

const publishedSeasonValueSQL = (
  field:
    | 'season_initial_account_level_before'
    | 'season_achieved_account_level_before',
  userIdExpression: string,
  seasonExpression: string,
  rawExpression: string
): string => `COALESCE((
  SELECT CASE
    WHEN NOT (${validReceiptSQL('pending_experience', 'pending_match')})
      THEN -1
    WHEN pending_experience.season_stats_existed_before = 0
      THEN ${ABSENT_SEASON_STATS}
    ELSE pending_experience.${field}
  END
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.user_id = ${userIdExpression}
    AND pending_experience.season = ${seasonExpression}
    AND pending_match.status <> 'ended'
  ORDER BY pending_experience.rowid ASC
  LIMIT 1
), ${rawExpression}, ${ABSENT_SEASON_STATS})`

export const publishedSeasonInitialLevelSQL = (
  userIdExpression: string,
  seasonExpression: string,
  rawExpression: string
): string =>
  publishedSeasonValueSQL(
    'season_initial_account_level_before',
    userIdExpression,
    seasonExpression,
    rawExpression
  )

export const publishedSeasonAchievedLevelSQL = (
  userIdExpression: string,
  seasonExpression: string,
  rawExpression: string
): string =>
  publishedSeasonValueSQL(
    'season_achieved_account_level_before',
    userIdExpression,
    seasonExpression,
    rawExpression
  )

/** Bind or inline the same trusted user/season expressions as the caller. */
export const noUnpublishedMatchExperienceSQL = (
  userIdExpression: string,
  seasonExpression?: string
): string => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.user_id = ${userIdExpression}
    AND pending_match.status <> 'ended'
    ${seasonExpression ? `AND pending_experience.season = ${seasonExpression}` : ''}
)`

export const publishedReferralLevelsSQL = (
  inviteeUserIdExpression: string,
  inviterUserIdExpression: string,
  seasonExpression: string,
  rawExpression: string
): string => `COALESCE((
  SELECT CASE
    WHEN ${validReceiptSQL('pending_experience', 'pending_match')}
      AND pending_experience.inviter_user_id = ${inviterUserIdExpression}
      AND pending_experience.after_level > pending_experience.before_level
      THEN pending_experience.inviter_levels_before
    ELSE -1
  END
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.user_id = ${inviteeUserIdExpression}
    AND pending_experience.inviter_user_id = ${inviterUserIdExpression}
    AND pending_experience.season = ${seasonExpression}
    AND pending_experience.after_level > pending_experience.before_level
    AND pending_match.status <> 'ended'
  ORDER BY pending_experience.rowid ASC
  LIMIT 1
), ${rawExpression}, -1)`

export const publishedReferralStickerPointsSQL = (
  inviterUserIdExpression: string,
  rawExpression: string
): string => `COALESCE((
  SELECT CASE
    WHEN ${validReceiptSQL('pending_experience', 'pending_match')}
      AND pending_experience.inviter_user_id = ${inviterUserIdExpression}
      AND pending_experience.after_level > pending_experience.before_level
      THEN pending_experience.inviter_sticker_points_before
    ELSE -1
  END
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.inviter_user_id = ${inviterUserIdExpression}
    AND pending_experience.after_level > pending_experience.before_level
    AND pending_match.status <> 'ended'
  ORDER BY pending_experience.rowid ASC
  LIMIT 1
), ${rawExpression}, -1)`

const publishedReferralStickerTimestampSQL = (
  field:
    | 'inviter_sticker_points_created_at_before'
    | 'inviter_sticker_points_updated_at_before',
  inviterUserIdExpression: string,
  rawExpression: string
): string => `COALESCE((
  SELECT CASE
    WHEN ${validReceiptSQL('pending_experience', 'pending_match')}
      AND pending_experience.inviter_user_id = ${inviterUserIdExpression}
      AND pending_experience.after_level > pending_experience.before_level
      AND pending_experience.inviter_sticker_points_existed_before = 1
      THEN pending_experience.${field}
    WHEN ${validReceiptSQL('pending_experience', 'pending_match')}
      AND pending_experience.inviter_user_id = ${inviterUserIdExpression}
      AND pending_experience.after_level > pending_experience.before_level
      THEN ''
    ELSE '#invalid'
  END
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.inviter_user_id = ${inviterUserIdExpression}
    AND pending_experience.after_level > pending_experience.before_level
    AND pending_match.status <> 'ended'
  ORDER BY pending_experience.rowid ASC
  LIMIT 1
), ${rawExpression}, '#invalid')`

export const publishedReferralStickerCreatedAtSQL = (
  inviterUserIdExpression: string,
  rawExpression: string
): string =>
  publishedReferralStickerTimestampSQL(
    'inviter_sticker_points_created_at_before',
    inviterUserIdExpression,
    rawExpression
  )

export const publishedReferralStickerUpdatedAtSQL = (
  inviterUserIdExpression: string,
  rawExpression: string
): string =>
  publishedReferralStickerTimestampSQL(
    'inviter_sticker_points_updated_at_before',
    inviterUserIdExpression,
    rawExpression
  )

export const noUnpublishedReferralPointsSQL = (
  inviterUserIdExpression: string,
  seasonExpression?: string
): string => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.inviter_user_id = ${inviterUserIdExpression}
    AND pending_experience.after_level > pending_experience.before_level
    AND pending_match.status <> 'ended'
    ${seasonExpression ? `AND pending_experience.season = ${seasonExpression}` : ''}
)`

export const noUnpublishedReferralLevelsSQL = (
  inviteeUserIdExpression: string,
  inviterUserIdExpression: string,
  seasonExpression: string
): string => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_experience_players pending_experience
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_experience.proposal_id
  WHERE pending_experience.user_id = ${inviteeUserIdExpression}
    AND pending_experience.inviter_user_id = ${inviterUserIdExpression}
    AND pending_experience.season = ${seasonExpression}
    AND pending_experience.after_level > pending_experience.before_level
    AND pending_match.status <> 'ended'
)`

export const sourceVisibleAccountLevel = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(INVALID_EXPERIENCE_PROJECTION)
  }
  return value
}

export const sourceVisibleExperienceXp = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value >= 200
  ) {
    throw new Error(INVALID_EXPERIENCE_PROJECTION)
  }
  return value
}

export const sourceVisibleNonNegative = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(INVALID_EXPERIENCE_PROJECTION)
  }
  return value
}

export const sourceVisibleTimestamp = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(INVALID_EXPERIENCE_PROJECTION)
  }
  return value
}

export const sourceVisibleSeasonProgress = (
  initial: unknown,
  achieved: unknown
): { initial: number | null; achieved: number | null } => {
  if (initial === ABSENT_SEASON_STATS && achieved === ABSENT_SEASON_STATS) {
    return { initial: null, achieved: null }
  }
  if (
    typeof initial !== 'number' ||
    typeof achieved !== 'number' ||
    !Number.isSafeInteger(initial) ||
    !Number.isSafeInteger(achieved) ||
    initial < 0 ||
    achieved < initial
  ) {
    throw new Error(INVALID_EXPERIENCE_PROJECTION)
  }
  return { initial, achieved }
}
