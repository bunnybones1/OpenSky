import { GameMode } from '@opensky/proto'

import { isBot, MatchmakerPlayer, waitTimeMs } from './model'
import { MatchValidator } from './criteria'
import { sortByMatchQuality } from './quality'

export class PlayerCombinationMap {
  private readonly matches = new Map<string, Set<string>>()
  private readonly playersByAddress = new Map<string, MatchmakerPlayer>()
  private playerOrder: string[] = []

  add(player1: MatchmakerPlayer, player2: MatchmakerPlayer) {
    for (const player of [player1, player2]) {
      if (!this.playersByAddress.has(player.address)) {
        this.playersByAddress.set(player.address, player)
        this.playerOrder.push(player.address)
        this.matches.set(player.address, new Set())
      }
    }
    this.matches.get(player1.address)?.add(player2.address)
    this.matches.get(player2.address)?.add(player1.address)
  }

  players() {
    return this.playerOrder
      .map((address) => this.playersByAddress.get(address))
      .filter((player): player is MatchmakerPlayer => Boolean(player))
  }

  candidates(player: MatchmakerPlayer) {
    const matches = this.matches.get(player.address)
    if (!matches) return []
    return this.playerOrder
      .filter((address) => matches.has(address))
      .map((address) => this.playersByAddress.get(address))
      .filter((candidate): candidate is MatchmakerPlayer => Boolean(candidate))
  }

  remove(player: MatchmakerPlayer) {
    for (const candidates of this.matches.values()) candidates.delete(player.address)
    this.matches.delete(player.address)
    this.playersByAddress.delete(player.address)
    this.playerOrder = this.playerOrder.filter((address) => address !== player.address)

    for (const [address, candidates] of [...this.matches.entries()]) {
      if (candidates.size === 0) {
        this.matches.delete(address)
        this.playersByAddress.delete(address)
        this.playerOrder = this.playerOrder.filter((current) => current !== address)
      }
    }
  }
}

export const combinePlayers = (
  players: MatchmakerPlayer[],
  botValidator: MatchValidator,
  validators: MatchValidator[],
  now: () => number = Date.now
): PlayerCombinationMap => {
  if (players.length < 2) {
    throw new Error(`expecting at least 2 players, got ${players.length}`)
  }
  const sorted = players
    .map((player, index) => ({ player, index }))
    .sort(
      (left, right) =>
        waitTimeMs(right.player, now()) - waitTimeMs(left.player, now()) ||
        left.index - right.index
    )
    .map(({ player }) => player)
  const combinations = new PlayerCombinationMap()

  for (let left = 0; left < sorted.length - 1; left += 1) {
    for (let right = left + 1; right < sorted.length; right += 1) {
      const player1 = sorted[left]
      const player2 = sorted[right]
      if (player1.address === player2.address) continue
      try {
        const valid =
          isBot(player1) || isBot(player2)
            ? botValidator(player1, player2)
            : validators.every((validator) => validator(player1, player2))
        if (valid) combinations.add(player1, player2)
      } catch {
        // Go source logs validator failures and skips only the affected pair.
      }
    }
  }
  return combinations
}

export enum MatchProposalStatus {
  FOUND = 1,
  ACCEPTED = 2,
  TO_BE_MADE = 3
}

export class MatchProposal {
  readonly addresses: string[]
  readonly gameModes: Set<GameMode>
  readonly accepted = new Set<string>()
  status = MatchProposalStatus.FOUND

  constructor(
    readonly id: string,
    readonly players: MatchmakerPlayer[]
  ) {
    this.addresses = players.map((player) => player.address)
    this.gameModes = new Set(players.map((player) => player.mode))
  }

  accept(player: MatchmakerPlayer) {
    this.accepted.add(player.address)
  }

  haveAllAccepted() {
    return this.addresses.every((address) => this.accepted.has(address))
  }

  opponent(player: MatchmakerPlayer) {
    if (this.addresses.length === 0) throw new Error('there are not players')
    if (this.addresses.length > 2) throw new Error('there are more than 2 players')
    const opponent = this.players.find((candidate) => candidate.address !== player.address)
    if (!opponent) throw new Error('oppononent not found')
    return opponent
  }

  setFound() {
    this.status = MatchProposalStatus.FOUND
  }

  isFound() {
    return this.status === MatchProposalStatus.FOUND
  }

  setAccepted() {
    this.status = MatchProposalStatus.ACCEPTED
  }

  isAccepted() {
    return this.status === MatchProposalStatus.ACCEPTED
  }

  setToBeMade() {
    this.status = MatchProposalStatus.TO_BE_MADE
  }

  isToBeMade() {
    return this.status === MatchProposalStatus.TO_BE_MADE
  }

  playersCount() {
    return this.addresses.length
  }

  isConquest() {
    return (
      this.gameModes.has(GameMode.CONQUEST_CONSTRUCTED) ||
      this.gameModes.has(GameMode.CONQUEST_DISCOVERY)
    )
  }

  isChallenge() {
    return (
      this.gameModes.has(GameMode.CHALLENGE_CONSTRUCTED) ||
      this.gameModes.has(GameMode.CHALLENGE_DISCOVERY)
    )
  }
}

export interface BotFactory {
  createRegistered(
    player: MatchmakerPlayer
  ): MatchmakerPlayer | Promise<MatchmakerPlayer>
}

export const processCombinations = async (
  combinations: PlayerCombinationMap,
  botFactory: BotFactory,
  idGenerator: () => string = () => crypto.randomUUID(),
  qualitySorter = sortByMatchQuality
): Promise<MatchProposal[]> => {
  const proposals: MatchProposal[] = []
  for (;;) {
    const matchedPlayers = combinations.players()
    if (matchedPlayers.length < 1) return proposals
    const player1 = matchedPlayers[0]
    const candidates = combinations.candidates(player1)
    if (candidates.length < 1) return proposals
    combinations.remove(player1)
    qualitySorter(player1, candidates)

    for (let player2 of candidates) {
      combinations.remove(player2)
      if (isBot(player2)) {
        try {
          player2 = await botFactory.createRegistered(player1)
        } catch {
          continue
        }
      }
      proposals.push(new MatchProposal(idGenerator(), [player1, player2]))
      break
    }
  }
}
