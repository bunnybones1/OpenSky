export function isLocalDevelopmentHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  return (
    normalized.includes('localhost') ||
    normalized.includes('192.168.') ||
    normalized.includes('local.0xhorizon.net') ||
    normalized.includes('127.0.0.1')
  )
}

export function isDevelopmentHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  const labels = normalized.split('.')
  // A public suffix can itself be `.dev` (Cloudflare uses `workers.dev`). Only
  // explicit development subdomain labels should unlock debug behavior.
  const subdomainLabels = labels.slice(0, -1)
  return (
    isLocalDevelopmentHostname(normalized) ||
    subdomainLabels.some(label => /^dev(?:\d+)?(?:-|$)/.test(label)) ||
    normalized.includes('ngrok')
  )
}

const runtimeHostname = typeof location === 'undefined' ? '' : location.hostname
const localDevMode = isLocalDevelopmentHostname(runtimeHostname)
const devMode = isDevelopmentHostname(runtimeHostname)

export function isDevMode() {
  return devMode
}

export function isLocalDevMode() {
  return localDevMode
}
