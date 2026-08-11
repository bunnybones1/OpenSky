import {
  fetchIdentityGamePrincipal,
  gamePrincipalFromIdentitySession
} from './identitySession'

const principal = '0x1234567890abcdef1234567890abcdef12345678'

describe('Google identity game principal', () => {
  it('accepts an authenticated identity session principal', () => {
    expect(
      gamePrincipalFromIdentitySession({
        authenticated: true,
        gamePrincipal: principal
      })
    ).toBe(principal)
  })

  it.each([
    undefined,
    {},
    { authenticated: false, gamePrincipal: principal },
    { authenticated: true, gamePrincipal: 'identity:user' },
    { authenticated: true, gamePrincipal: principal.toUpperCase() }
  ])('rejects an unusable identity session (%p)', value => {
    expect(() => gamePrincipalFromIdentitySession(value)).toThrow()
  })

  it('requests the dedicated identity endpoint with the session cookie', async () => {
    const fetcher = jest.fn(() =>
      Promise.resolve(
        Response.json({ authenticated: true, gamePrincipal: principal })
      )
    ) as unknown as typeof fetch

    await expect(fetchIdentityGamePrincipal('/api/', fetcher)).resolves.toBe(
      principal
    )
    expect(fetcher).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
  })

  it('rejects a failed identity request before parsing it', async () => {
    const fetcher = jest.fn(() =>
      Promise.resolve(Response.json({}, { status: 401 }))
    ) as unknown as typeof fetch

    await expect(fetchIdentityGamePrincipal('/api', fetcher)).rejects.toThrow(
      'Identity session request failed (401).'
    )
  })
})
