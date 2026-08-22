interface AddressedParticipant {
  player: { address: string }
}

const encoder = new TextEncoder()

// Source oracle: director/matchhandlers/player_shuffler.go copies and shuffles
// both players immediately before game creation. A proposal UUID is already
// generated with cryptographic randomness; deriving the coin flip from it gives
// Cloudflare the same unbiased side assignment while keeping retries stable.
export const orderParticipantsForGame = async <T extends AddressedParticipant>(
  proposalId: string,
  participants: [T, T]
): Promise<[T, T]> => {
  const canonical = [...participants].sort((left, right) =>
    left.player.address.localeCompare(right.player.address)
  ) as [T, T]
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`cloud-weasel-player-order:${proposalId}`)
    )
  )
  return (digest[0] & 1) === 0
    ? canonical
    : [canonical[1], canonical[0]]
}
