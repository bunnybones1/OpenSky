import {
  isDevelopmentHostname,
  isLocalDevelopmentHostname
} from '@opensky/shared/devMode'

describe('development hostname classification', () => {
  it.each([
    'localhost',
    '127.0.0.1',
    '192.168.1.20',
    'local.0xhorizon.net'
  ])('keeps local development enabled for %s', hostname => {
    expect(isLocalDevelopmentHostname(hostname)).toBe(true)
    expect(isDevelopmentHostname(hostname)).toBe(true)
  })

  it.each([
    'dev.skyweaver.net',
    'dev6.skyweaver.net',
    'dev6-api.skyweaver.net',
    'cloud-weasel.ngrok-free.app'
  ])('keeps explicit remote development enabled for %s', hostname => {
    expect(isDevelopmentHostname(hostname)).toBe(true)
  })

  it.each([
    'opensky-webapp.dysinski-tomasz.workers.dev',
    'cloud-weasel.example.dev',
    'device.example.com',
    'skyweaver.net'
  ])('does not unlock debug behavior for production-like host %s', hostname => {
    expect(isDevelopmentHostname(hostname)).toBe(false)
  })
})
