import type { GameServerEnv } from '../src/game-match'

declare module 'cloudflare:test' {
  interface ProvidedEnv extends GameServerEnv {}
}
