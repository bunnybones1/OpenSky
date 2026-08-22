import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const devHostGateErrors = ({ devModeSource, footerSource }) => {
  const errors = []
  for (const token of [
    'export function isDevelopmentHostname(hostname: string)',
    'const subdomainLabels = labels.slice(0, -1)',
    '/^dev(?:\\d+)?(?:-|$)/.test(label)',
    "const runtimeHostname = typeof location === 'undefined' ? '' : location.hostname",
    'const devMode = isDevelopmentHostname(runtimeHostname)'
  ]) {
    if (!devModeSource.includes(token)) {
      errors.push(`development hostname boundary is missing: ${token}`)
    }
  }
  if (devModeSource.includes("includes('dev')")) {
    errors.push('development mode still matches the workers.dev public suffix')
  }
  if (!footerSource.includes('{isDevMode() && (')) {
    errors.push('secret debug navigation is no longer development-gated')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const [devModeSource, footerSource] = await Promise.all([
    readFile(path.join(root, 'lib/shared/src/devMode.ts'), 'utf8'),
    readFile(path.join(root, 'webapp/src/shared/components/Footer/Footer.tsx'), 'utf8')
  ])
  const errors = devHostGateErrors({ devModeSource, footerSource })
  if (errors.length) {
    for (const error of errors) process.stderr.write(`Dev-host gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Cloudflare workers.dev hosts cannot unlock source developer behavior\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
