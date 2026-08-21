import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const bodyBetween = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const requireOrdered = (errors, label, source, tokens) => {
  let prior = -1
  for (const token of tokens) {
    const index = source.indexOf(token, prior + 1)
    if (index < 0) {
      errors.push(
        source.includes(token)
          ? `${label} order changed at: ${token}`
          : `${label} is missing: ${token}`
      )
      continue
    }
    prior = index
  }
}

export const gameIngressErrors = ({
  sourceServer,
  sourcePlayerContext,
  sourceBrowserSocket,
  workerProtocol,
  workerMatch,
  workerProtocolTest,
  workerRuntimeTest,
  rootPackage
}) => {
  const errors = []

  const sourceMessage = bodyBetween(
    sourceServer,
    'private async onClientMessage(',
    '\n  }\n}'
  )
  requireOrdered(errors, 'Source game frame ingress', sourceMessage, [
    'const strData = data.toString()',
    "if (strData.startsWith('PING')) {",
    "const split = strData.split(':')",
    'if (split.length < 2) {',
    'playerContext.ping(split[1])',
    'message = JSON.parse(strData)',
    "logger.error('WS ERROR PARSING MESSAGE'",
    'this.matchManager.handleMessage(message, playerContext)'
  ])

  if (!sourcePlayerContext.includes('const KEEPALIVE_INTERVAL = 5000')) {
    errors.push('Source game keepalive interval is no longer five seconds')
  }
  if (!sourcePlayerContext.includes('const KEEPALIVE_GRACE_PERIOD = 2000')) {
    errors.push('Source game server keepalive grace is no longer two seconds')
  }
  const sourcePing = bodyBetween(
    sourcePlayerContext,
    'ping(id: string): void {',
    '\n  }\n}'
  )
  requireOrdered(errors, 'Source game application heartbeat', sourcePing, [
    'this.clearPingInterval()',
    'const latency = now - last - KEEPALIVE_INTERVAL',
    'KEEPALIVE_INTERVAL + KEEPALIVE_GRACE_PERIOD + latency',
    'this.connection.send(`PONG:${id}`)',
    'this._keepaliveInterval = global.setTimeout(() => {',
    'this.connection.terminate()',
    '}, this._keepaliveResponseTime)'
  ])

  if (!sourceBrowserSocket.includes('const KEEPALIVE_INTERVAL = 5000')) {
    errors.push('Source browser keepalive interval is no longer five seconds')
  }
  requireOrdered(
    errors,
    'Source browser missed-PONG recovery',
    sourceBrowserSocket,
    [
      "if (ev.data.toString().startsWith('PONG')) {",
      'clearTimeout(this._keepaliveFailTimeout)',
      'this._keepaliveInterval = setInterval(() => {',
      "thisConn.send('PING:' + this._keepaliveID)",
      'this._keepaliveFailTimeout = setTimeout(() => {',
      'this.close(thisConn)',
      '}, this._latencyAdjustedResponseTime)',
      '}, KEEPALIVE_INTERVAL)'
    ]
  )

  const workerDecode = bodyBetween(
    workerProtocol,
    'export const decodeClientFrame = (',
    'export const parseSourcePing = ('
  )
  requireOrdered(
    errors,
    'Worker source-compatible frame decoding',
    workerDecode,
    [
      'const bytes =',
      'new TextEncoder().encode(raw)',
      'new Uint8Array(raw)',
      'if (bytes.byteLength > MAX_GAME_MESSAGE_BYTES) {',
      "typeof raw === 'string' ? raw : new TextDecoder().decode(bytes)"
    ]
  )
  if (workerDecode.includes('binary messages are not supported')) {
    errors.push('Worker still rejects source-compatible binary game frames')
  }

  const workerPing = bodyBetween(
    workerProtocol,
    'export const parseSourcePing = (',
    'export const parseClientMessage = ('
  )
  requireOrdered(errors, 'Worker source-compatible PING decoder', workerPing, [
    "if (!frame.startsWith('PING')) return { handled: false }",
    "const fields = frame.split(':')",
    'fields.length < 2',
    '{ handled: true, id: fields[1] }'
  ])

  const workerMessage = bodyBetween(
    workerMatch,
    'async webSocketMessage(',
    'async webSocketClose('
  )
  requireOrdered(errors, 'Worker game frame routing', workerMessage, [
    'const frame = decodeClientFrame(raw)',
    'const ping = parseSourcePing(frame)',
    'if (ping.handled) {',
    'if (ping.id !== undefined) {',
    'this.safeSend(socket, `PONG:${ping.id}`)',
    'const message = parseClientMessage(frame)'
  ])
  for (const token of [
    'Cloudflare owns protocol ping/pong and disconnect detection',
    'the preserved browser still closes',
    'Do not wake',
    'duplicate five-second alarm'
  ]) {
    if (!workerMessage.includes(token)) {
      errors.push(`Worker keepalive disposition is missing: ${token}`)
    }
  }

  for (const [label, source, tokens] of [
    [
      'unit',
      workerProtocolTest,
      [
        "it('preserves the source PING prefix and first colon-delimited ID'",
        "it('accepts source-compatible binary JSON and bounds malformed messages'",
        'new ArrayBuffer(MAX_GAME_MESSAGE_BYTES + 1)'
      ]
    ],
    [
      'Workers',
      workerRuntimeTest,
      [
        "it('preserves source text and binary game frames across hibernation'",
        "first.send('PINGlegacy:roundtrip:ignored')",
        "expect(await pong).toBe('PONG:roundtrip')",
        'await evictDurableObject(stub())',
        'as ArrayBuffer'
      ]
    ]
  ]) {
    for (const token of tokens) {
      if (!source.includes(token)) {
        errors.push(
          `Worker ${label} game-ingress regression is missing: ${token}`
        )
      }
    }
  }

  const scripts = rootPackage?.scripts ?? {}
  if (
    !String(scripts['build:cloudflare'] ?? '').includes(
      'pnpm check:cloudflare:game-ingress'
    )
  ) {
    errors.push('Complete Cloudflare build omits the game ingress gate')
  }
  if (
    !String(scripts['deploy:cloudflare:game-server'] ?? '').includes(
      'pnpm check:cloudflare:game-ingress'
    )
  ) {
    errors.push('Game-server deployment omits the ingress source gate')
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    sourceServer,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  ] = await Promise.all([
    readFile(path.join(root, 'server/src/Server.ts'), 'utf8'),
    readFile(path.join(root, 'server/src/PlayerContext.ts'), 'utf8'),
    readFile(path.join(root, 'game/src/state/net/WebSocketClient.ts'), 'utf8'),
    readFile(path.join(root, 'game-server-cloudflare/src/protocol.ts'), 'utf8'),
    readFile(
      path.join(root, 'game-server-cloudflare/src/game-match.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare/test/protocol.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare/test-cloudflare/game-match.test.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse)
  ])
  const errors = gameIngressErrors({
    sourceServer,
    sourcePlayerContext,
    sourceBrowserSocket,
    workerProtocol,
    workerMatch,
    workerProtocolTest,
    workerRuntimeTest,
    rootPackage
  })
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare game ingress preserves source text/binary frames and application PING behavior'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
