export interface ReplayAnalyticsMessage {
  type: 'process-match-replay'
  proposalId: string
  matchId: number
  replayId: string
  releaseVersion: string
  endedAt: string
  archivePrefix: string
  replayRecordCount: number
  replayBytes: number
}

export const isReplayAnalyticsMessage = (
  value: unknown
): value is ReplayAnalyticsMessage => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const message = value as Partial<ReplayAnalyticsMessage>
  return (
    message.type === 'process-match-replay' &&
    typeof message.proposalId === 'string' &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(message.proposalId) &&
    Number.isSafeInteger(message.matchId) &&
    (message.matchId ?? -1) >= 0 &&
    typeof message.replayId === 'string' &&
    message.replayId.length >= 1 &&
    message.replayId.length <= 256 &&
    typeof message.releaseVersion === 'string' &&
    /^[a-zA-Z0-9._-]{1,128}$/.test(message.releaseVersion) &&
    typeof message.endedAt === 'string' &&
    Number.isFinite(Date.parse(message.endedAt)) &&
    typeof message.archivePrefix === 'string' &&
    message.archivePrefix ===
      `replays/${message.releaseVersion}/${message.proposalId}/` &&
    Number.isSafeInteger(message.replayRecordCount) &&
    (message.replayRecordCount ?? 0) >= 1 &&
    (message.replayRecordCount ?? 0) <= 10_000 &&
    Number.isSafeInteger(message.replayBytes) &&
    (message.replayBytes ?? 0) >= 1 &&
    (message.replayBytes ?? 0) <= 100 * 1024 * 1024
  )
}
