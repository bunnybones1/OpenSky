export interface CookieOptions {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'Lax' | 'Strict'
  secure?: boolean
}

export const readCookies = (request: Request): Map<string, string> => {
  const cookies = new Map<string, string>()
  const header = request.headers.get('Cookie')
  if (!header) return cookies

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (name) cookies.set(name, value)
  }

  return cookies
}

export const serializeCookie = (
  name: string,
  value: string,
  options: CookieOptions = {}
): string => {
  const parts = [`${name}=${value}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  parts.push(`Path=${options.path || '/'}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  parts.push(`SameSite=${options.sameSite || 'Lax'}`)
  return parts.join('; ')
}

export const clearCookie = (
  name: string,
  options: Omit<CookieOptions, 'maxAge'> = {}
): string => serializeCookie(name, '', { ...options, maxAge: 0 })
