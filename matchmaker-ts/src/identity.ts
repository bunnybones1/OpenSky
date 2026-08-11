const GAME_PRINCIPAL_DOMAIN = 'cloud-weasel-game-principal:v1:'

const bytesToHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

/**
 * Produces the stable 20-byte identifier required by the game protocol without
 * turning a wallet into the account identity. Wallet addresses can be linked as
 * optional account metadata later.
 */
export const deriveGamePrincipal = async (identityUserId: string) => {
  if (identityUserId.length === 0 || identityUserId.length > 256) {
    throw new Error('invalid identity user ID')
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${GAME_PRINCIPAL_DOMAIN}${identityUserId}`)
  )
  return `0x${bytesToHex(new Uint8Array(digest).slice(0, 20))}`
}

export const isGamePrincipal = (value: string) => /^0x[0-9a-f]{40}$/.test(value)
