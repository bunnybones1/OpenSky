import type { MatchmakerEnv } from '../src/runtime'

declare module 'cloudflare:test' {
  interface ProvidedEnv extends MatchmakerEnv {}
}
