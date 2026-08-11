import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseVersion = process.env.RELEASE_VERSION || 'cloudflare'
if (!/^[a-zA-Z0-9._-]+$/.test(releaseVersion)) {
  throw new Error(
    'RELEASE_VERSION may contain only letters, numbers, dots, underscores, and hyphens.'
  )
}
const buildEnv = {
  ...process.env,
  DIST: 'cloudflare',
  GITCOMMIT: process.env.GITCOMMIT || releaseVersion,
  RELEASE_VERSION: releaseVersion
}

const run = (args) => {
  const pnpmCli = process.env.npm_execpath
  const command = pnpmCli ? process.execPath : 'pnpm'
  const commandArgs = pnpmCli ? [pnpmCli, ...args] : args
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    env: buildEnv,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

run(['--dir', 'webapp', 'dist'])
run(['--dir', 'game', 'dist'])

const webappDist = path.join(rootDir, 'webapp', 'dist')
const gameDist = path.join(rootDir, 'game', 'dist')
const gameClientDist = path.join(gameDist, 'game')
const gameTarget = path.join(webappDist, 'game', releaseVersion)

if (!existsSync(path.join(webappDist, 'index.html'))) {
  throw new Error('The webapp build did not produce index.html')
}
if (!existsSync(path.join(gameClientDist, 'index.html'))) {
  throw new Error('The game build did not produce game/index.html')
}

rmSync(gameTarget, { force: true, recursive: true })
mkdirSync(gameTarget, { recursive: true })
cpSync(gameClientDist, gameTarget, { recursive: true })

const stateMappings = path.join(gameDist, 'state_mappings')
if (existsSync(stateMappings)) {
  cpSync(stateMappings, path.join(webappDist, 'state_mappings'), {
    recursive: true
  })
}

const maxCloudflareAssetBytes = 25 * 1024 * 1024
let fileCount = 0
let largestFile = { bytes: 0, file: '' }

const inspectOutput = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      inspectOutput(entryPath)
      continue
    }
    const relativePath = path.relative(webappDist, entryPath)
    const bytes = statSync(entryPath).size
    fileCount += 1
    if (bytes > largestFile.bytes) {
      largestFile = { bytes, file: relativePath }
    }
    if (bytes > maxCloudflareAssetBytes) {
      throw new Error(
        `${relativePath} is ${bytes} bytes; ` +
          'Cloudflare Workers static assets are limited to 25 MiB per file.'
      )
    }
  }
}

inspectOutput(webappDist)

console.log(`Cloudflare artifact: ${webappDist}`)
console.log(`Game entry: /game/${releaseVersion}/?mode=LOCAL_BOT&skipAuth`)
console.log(
  `Validated ${fileCount} files; largest is ${largestFile.file} ` +
    `(${(largestFile.bytes / 1024 / 1024).toFixed(2)} MiB).`
)
