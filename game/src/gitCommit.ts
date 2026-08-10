import { isLocalDevMode } from '@opensky/shared/devMode'

let _gitCommit: string | undefined

export default function getGitCommit() {
  if (_gitCommit !== undefined) {
    return _gitCommit
  }
  const url = new URL(self.location.href)
  const chunks = url.pathname.split('/')
  const probablyHash = chunks.find((s) => s.length === 40)
  if (probablyHash) {
    _gitCommit = probablyHash
  } else if (isLocalDevMode()) {
    // In local dev we sometimes serve the game at /game/dev/... instead of /game/.
    const gameSegmentIndex = chunks.findIndex((s) => s === 'game')
    const localVersionSegment =
      gameSegmentIndex >= 0 ? chunks[gameSegmentIndex + 1] : undefined
    if (localVersionSegment) {
      _gitCommit = localVersionSegment
      return _gitCommit
    }
    console.warn('no git commit found in path')
    _gitCommit = ''
  }
  return _gitCommit!
}
