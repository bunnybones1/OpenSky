import { MatchProxy } from '../core/MatchProxy'

export class MatchbookService {
  matches: Map<number, MatchProxy>
  playerMatches: Map<string, number> // <playerAddress, matchId>

  matchesHosted = 0

  constructor() {
    this.matches = new Map()
    this.playerMatches = new Map()
  }

  get inProgressMatches(): number {
    return this.matches.size
  }

  addMatch(match: MatchProxy) {
    this.matches.set(match.matchID, match)
    match.playerInfo.forEach((_, id) => {
      this.playerMatches.set(id, match.matchID)
    })

    this.matchesHosted++
  }

  removeMatch(match: MatchProxy) {
    this.matches.delete(match.matchID)
    match.playerInfo.forEach((_, id) => {
      this.playerMatches.delete(id)
    })
  }

  getMatchByPlayerID(playerID: string): MatchProxy | undefined {
    const match = this.playerMatches.get(playerID)
    if (match === undefined) {
      return match
    }
    return this.matches.get(match)
  }

  getMatchByMatchID(matchID: number): MatchProxy | undefined {
    return this.matches.get(matchID)
  }
}
