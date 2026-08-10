import { jwtDecodeClaims } from '@0xsequence/utils'

export const isJWTExpired = (jwt: string): boolean => {
  const expiry = jwtDecodeClaims<{ exp: number }>(jwt).exp
  const now = Math.floor(Date.now() / 1000)

  return expiry < now
}
