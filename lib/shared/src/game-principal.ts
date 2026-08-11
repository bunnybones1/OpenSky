const GAME_PRINCIPAL_DOMAIN = 'cloud-weasel-game-principal:v1:'

const bytesToHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

/**
 * Stable game-protocol identifier for an account identity. This is not a
 * wallet and does not imply that the user controls an EVM private key.
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
