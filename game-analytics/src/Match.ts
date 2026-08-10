import { decode, encode, VERSION } from '@opensky/deck-string-codec'
import { MatchLogStateInit, MatchLog } from '@opensky/shared/matchLog'
import { GameMode, DeckType } from '@opensky/proto'
import { initializeCardCache, getCardCache } from './cardCache'
import * as ethers from 'ethers'
import {
  CardLibrary,
  PlayerAction,
  BaseCard,
  Player,
  CardEvent,
  GameEvent,
  GameState,
  SkyWeaver,
  PlayerSecret,
  Secret
} from '@skyweaver/state-metadata'
import { WasmMatch } from '@skyweaver/state-node-sys'

interface Action {
  diffs: string[]
  timestamp: Date
}

type PlayerActionWithBaseCard =
  | PlayerAction
  | {
      type: 'PlayCard'
      cardID: BaseCard | number
      targetID: BaseCard | undefined | '0'
    }
  | {
      type: 'Attack'
      attackerID: BaseCard | '0'
      defenderID: BaseCard | '0'
    }

//TODO: add mana casted for?
interface MoveData {
  matchID: number
  player: Player
  turnNumber: number
  moveNumber: number
  type:
    | 'PlayCard'
    | 'Attack'
    | 'EndTurn'
    | 'Setup'
    | 'Concede'
    | 'CommitCardSelection'
    | 'Cheat'
    | 'Timeout'
    | 'Abandon'
  fromID: number | BaseCard | '0' //either the played card, or attacking unit
  toID: number | BaseCard | '0' //either the target card, or defending unit
}
interface RawMoveData {
  player: Player
  moveNumber: number
  data: PlayerActionWithBaseCard
}

type DeckData = {
  deckStrings: PlayerData<string | null>[]
  deckVersion: PlayerData<string>[]
  deckType: PlayerData<DeckType>[]
}

type GameStateData = {
  matchID: number
  turnNumber: number
  moveNumber: number

  p0FieldCards: Array<BaseCard | '0'>
  p0HandCards: Array<BaseCard | undefined>
  p0DeckCards: Array<BaseCard>
  p0GraveyardCards: Array<BaseCard | undefined>
  p0DustedCards: Array<BaseCard | undefined>

  p1FieldCards: Array<BaseCard | '0'>
  p1HandCards: Array<BaseCard | undefined>
  p1DeckCards: Array<BaseCard>
  p1GraveyardCards: Array<BaseCard | undefined>
  p1DustedCards: Array<BaseCard | undefined>

  p0Mana: number
  p1Mana: number
  p0MaxMana: number
  p1MaxMana: number
  p0HeroHP: number
  p1HeroHP: number
}
type PlayerData<T> = { player: Player; data: T }
export interface MatchData {
  type: 'matchData'

  matchStartTimeStamp: Date
  matchEndTimeStamp: Date
  dataUploadTimeStamp: Date
  durationInSec: number

  gameMode: GameMode
  matchID: number

  p0Address: string
  p1Address: string

  p0DeckString: string | null
  p0DeckVersion: string
  p0DeckType: DeckType
  p0DeckCards: BaseCard[]
  p1DeckString: string | null
  p1DeckVersion: string
  p1DeckType: DeckType
  p1DeckCards: BaseCard[]

  turnCount: number
  moveCount: number

  p0CardSelection: Array<BaseCard>
  p1CardSelection: Array<BaseCard>
  p0OpeningHandSelection: Array<BaseCard>
  p1OpeningHandSelection: Array<BaseCard>

  /// 2 is a draw
  winner: 0 | 1 | 2 | undefined

  //additional tables below
  moveData: MoveData[]
  gameStateData: GameStateData[]
}
export class Game {
  lastActionAppliedTime: Date
  static async loadMatch(matchID: number, matchLogJSONs: Array<string>) {
    const initLog = JSON.parse(matchLogJSONs[0])[0] as MatchLogStateInit
    const actions: Action[] = []
    let highestSeenTime = 0
    stop: for (let i = 1; i < matchLogJSONs.length; i++) {
      const archiveRecords: MatchLog[] = JSON.parse(matchLogJSONs[i])
      for (const record of archiveRecords) {
        if (record.type === 'gameplay' && record.message.type === 'gameplay') {
          const time = Date.parse(record.timestamp as unknown as string)
          // Workaround for dev re-using match IDs
          // Dev envs might upload to the same S3 path as another old match,
          // so if our replay suddenly jumps into the past,
          // stop reading it.
          if (time < highestSeenTime) {
            console.warn(
              'Dev replay bug workaround: Replay jumped into the past, ignoring further frames.'
            )
            break stop
          }
          highestSeenTime = time
          actions.push({
            diffs: record.message.data,
            timestamp: new Date(record.timestamp)
          })
        }
      }
    }
    try {
      const game = new Game(initLog, actions, matchID)
      return game.matchData
    } catch (err) {
      return {
        type: 'error',
        err,
        lastActionTimeStamp: new Date(highestSeenTime)
      } as const
    }
  }

  private lastPlayerAction: RawMoveData
  private moveCount: number
  private turnCount: number | undefined = undefined
  private deckData: DeckData | undefined
  private moveData: MoveData[] = []
  private gameStateData: GameStateData[] = []
  matchData: MatchData

  constructor(initLog: MatchLogStateInit, actions: Action[], matchID: number) {
    this.lastActionAppliedTime = new Date(initLog.timestamp)
    this.moveCount = 0
    initializeCardCache(0)
    const store = new WasmMatch(
      undefined,
      ethers.utils.arrayify(initLog.rootProof),
      initLog.secrets,
      true,
      () => {
        // ready - never called unless we flush
      },
      () => {
        // sign - never called unless we flush
      },
      () => {
        // send - never called unless we flush
      },
      (_player: number | undefined, event: CardEvent<GameEvent>) => {
        getCardCache().processEvent(event)
        switch (event.type) {
          case 'GameEvent':
            const action = event.payload.event
            switch (action.type) {
              case 'EnterPlayerAction':
                if (action.payload[0] !== undefined) {
                  this.lastPlayerAction = {
                    player: action.payload[0],
                    moveNumber: this.moveCount,
                    data: action.payload[1]
                  }
                  this.moveCount++
                }
                break
              case 'EnterPhase':
            }
            break
          case 'MoveCard':
            if (event.payload.instance) {
              const id = event.payload.instance[0].id
              const instance = event.payload.instance[0]

              if (
                'cardID' in this.lastPlayerAction.data &&
                id === this.lastPlayerAction.data.cardID
              ) {
                this.lastPlayerAction.data.cardID = instance.base
              }
            }
        }

        // log
      },
      () => {
        // rng - never called unless we flush
      }
    )

    let cache = getCardCache()

    const getBaseCardFromCache = (id: number | BaseCard | '0') => {
      if (typeof id === 'string') {
        return id
      }
      const instance = cache.getInstance(id)
      if (instance) {
        return instance.base === 'Hero' ? '0' : instance.base
      }

      console.log('Failed to get instance from card cache for ', id)
      return undefined
    }
    this.matchData = {
      type: 'matchData',
      matchStartTimeStamp: this.lastActionAppliedTime,
      matchEndTimeStamp: this.lastActionAppliedTime,
      dataUploadTimeStamp: new Date(),
      durationInSec: 0,

      gameMode: initLog.gameMode,
      matchID,

      turnCount: 0,
      moveCount: 0,

      p0CardSelection: [],
      p1CardSelection: [],
      p0OpeningHandSelection: [],
      p1OpeningHandSelection: [],

      p0Address: initLog.players[0].id,
      p1Address: initLog.players[1].id,

      p0DeckString: initLog.players[0].initDeckString,
      p0DeckType:
        initLog.players[0].initDeckString.length < 8
          ? DeckType.RANDOM
          : DeckType.CUSTOM,
      p0DeckVersion: VERSION,
      p0DeckCards: decodeDeckstringOrPanic(initLog.players[0].initDeckString),
      p1DeckString: initLog.players[1].initDeckString,
      p1DeckType:
        initLog.players[1].initDeckString.length < 8
          ? DeckType.RANDOM
          : DeckType.CUSTOM,
      p1DeckVersion: VERSION,
      p1DeckCards: decodeDeckstringOrPanic(initLog.players[0].initDeckString),

      winner: undefined,

      moveData: [],
      gameStateData: []
    }
    try {
      for (const action of actions) {
        for (const diff of action.diffs) {
          store.raw_apply(ethers.utils.arrayify(diff))
          this.lastActionAppliedTime = action.timestamp
        }

        let state: GameState<SkyWeaver> | undefined
        let secrets: [PlayerSecret<Secret>, PlayerSecret<Secret>] | undefined
        try {
          state = store.state as GameState<SkyWeaver>
          secrets = [
            store.secret(0) as PlayerSecret<Secret>,
            store.secret(1) as PlayerSecret<Secret>
          ]
        } catch {
          // no state here, no problem
        }
        if (state && secrets) {
          const st = state
          const sec = secrets
          const getTimeInSeconds = (timeStamp: Date) => {
            return (
              timeStamp.getSeconds() +
              timeStamp.getMinutes() * 60 +
              timeStamp.getHours() * 60 * 60
            )
          }
          const getBaseCardsFromSecretIDs = (ids: number[], player: Player) => {
            let baseCards: BaseCard[] = []
            for (const b of ids) {
              const i = ids.indexOf(b)
              baseCards[i] = sec[player].instances.get(b)!.base
            }
            return baseCards
          }
          const getBaseCardsfromPublicIDs = (ids: number[]) => {
            const instances = st.instances
              .map(i => {
                if ('player' in i) {
                  return undefined
                } else {
                  return i.instance
                }
              })
              .filter(notEmpty)
            return ids.map(id => {
              const i = instances.find(i => i.id === id)

              if (i) {
                return i.base
              }
              return undefined
            })
          }
          function getGameStateData(
            state: GameState<SkyWeaver>,
            secrets: [PlayerSecret<Secret>, PlayerSecret<Secret>],
            turnCount: number,
            moveCount: number
          ): GameStateData {
            const p0PublicHandCards = getBaseCardsfromPublicIDs(
              state.playerCards[0].hand.filter(notEmpty)
            )
            const p1PublicHandCards = getBaseCardsfromPublicIDs(
              state.playerCards[1].hand.filter(notEmpty)
            )
            const p0HandCards = secrets[0].hand.map(b => {
              if (b === undefined) {
                return p0PublicHandCards.shift()
              }
              return secrets[0].instances.get(b)!.base
            })
            const p1HandCards = secrets[1].hand.map(b => {
              if (b === undefined) {
                return p1PublicHandCards.shift()
              }
              return secrets[1].instances.get(b)!.base
            })
            let data: GameStateData = {
              matchID,
              turnNumber: turnCount,
              moveNumber: moveCount,

              p0FieldCards: state.playerCards[0].field.map(
                c => getBaseCardFromCache(c)!
              ),
              p0HandCards,
              p0DeckCards: getBaseCardsFromSecretIDs(secrets[0].deck, 0),
              p0GraveyardCards: getBaseCardsfromPublicIDs(
                state.playerCards[0].graveyard
              ),
              p0DustedCards: getBaseCardsfromPublicIDs(
                state.playerCards[0].dust
              ),
              p1FieldCards: state.playerCards[1].field.map(
                c => getBaseCardFromCache(c)!
              ),
              p1HandCards,
              p1DeckCards: getBaseCardsFromSecretIDs(secrets[1].deck, 1),
              p1GraveyardCards: getBaseCardsfromPublicIDs(
                state.playerCards[1].graveyard
              ),
              p1DustedCards: getBaseCardsfromPublicIDs(
                state.playerCards[1].dust
              ),

              p0Mana: state.state.players[0].mana,
              p1Mana: state.state.players[1].mana,
              p0MaxMana: state.state.players[0].maxMana,
              p1MaxMana: state.state.players[1].maxMana,
              p0HeroHP: state.playerCards[0].field
                .filter(c => cache.getInstance(c)!.base === 'Hero')
                .map(i => cache.getInstance(i)!.state.view.health)[0],
              p1HeroHP: state.playerCards[1].field
                .filter(c => cache.getInstance(c)!.base === 'Hero')
                .map(i => cache.getInstance(i)!.state.view.health)[0]
            }
            return data
          }

          if (state.state.turnCount === 0) {
            const cardSelectionData = [
              {
                player: 0,
                data: getBaseCardsFromSecretIDs(secrets[0].cardSelection, 0)
              },
              {
                player: 1,
                data: getBaseCardsFromSecretIDs(secrets[1].cardSelection, 1)
              }
            ]
            if (cardSelectionData[0].data.length > 4 && cardSelectionData[1].data.length > 4) {
              this.matchData.p0CardSelection = cardSelectionData[0].data
              this.matchData.p1CardSelection = cardSelectionData[1].data
            }
          }
          if (state.state.turnCount === 1 && this.turnCount === 0) {
            const handCardData = [
              {
                player: 0,
                data: secrets[0].hand
                  .map((secretCard, i) =>
                    getBaseCardFromCache(
                      secretCard ?? st.playerCards[0].hand[i]!
                    )
                  )
                  .filter((b: BaseCard | '0') => b !== '0')
                  .slice(
                    0,
                    state.state.gameParams.playerParams[0].mulliganChoiceSize
                  ) as BaseCard[]
              },
              {
                player: 1,
                data: secrets[1].hand
                  .map((secretCard, i) =>
                    getBaseCardFromCache(
                      secretCard ?? st.playerCards[1].hand[i]!
                    )
                  )
                  .filter((b: BaseCard | '0') => b !== '0')
                  .slice(
                    0,
                    state.state.gameParams.playerParams[1].mulliganChoiceSize
                  ) as BaseCard[]
              }
            ]
            if (handCardData[0].data.length > 0) {
              this.matchData.p0OpeningHandSelection = handCardData[0].data
              this.matchData.p1OpeningHandSelection = handCardData[1].data
            }
          }

          if (this.lastPlayerAction) {
            switch (this.lastPlayerAction.data.type) {
              case 'PlayCard':
                if (this.lastPlayerAction.data.targetID != undefined) {
                  this.lastPlayerAction.data.targetID = getBaseCardFromCache(
                    this.lastPlayerAction.data.targetID
                  )
                }
                break
              case 'Attack':
                this.lastPlayerAction.data.attackerID = getBaseCardFromCache(
                  this.lastPlayerAction.data.attackerID
                )!
                this.lastPlayerAction.data.defenderID = getBaseCardFromCache(
                  this.lastPlayerAction.data.defenderID
                )!
                break
            }
            let convertedData = {
              type: this.lastPlayerAction.data.type,
              player: this.lastPlayerAction.player,
              moveNumber: this.lastPlayerAction.moveNumber,
              fromID:
                this.lastPlayerAction.data.type === 'Attack'
                  ? this.lastPlayerAction.data.attackerID
                  : this.lastPlayerAction.data.type === 'PlayCard'
                  ? this.lastPlayerAction.data.cardID
                  : undefined,
              toID:
                this.lastPlayerAction.data.type === 'Attack'
                  ? this.lastPlayerAction.data.defenderID
                  : this.lastPlayerAction.data.type === 'PlayCard'
                  ? this.lastPlayerAction.data.targetID
                  : undefined
            }

            let convertedLastActionData: MoveData = {
              ...convertedData,
              matchID,
              turnNumber: this.turnCount
            }
            this.gameStateData.push(
              getGameStateData(
                st,
                sec,
                this.turnCount,
                this.lastPlayerAction.moveNumber
              )
            )
            this.moveData.push(convertedLastActionData)
          }

          const isLastMoveOfGame =
            actions.indexOf(action) === actions.length - 1

          if (!(isLastMoveOfGame && this.turnCount)) {
            this.turnCount = state.state.turnCount
          }

          if (!this.deckData) {
            const p0String = decode(
              CardLibrary,
              initLog.players[0].initDeckString
            )
            if (typeof p0String === 'string') {
              throw new Error('Invalid p0 deckstring')
            }
            const p1String = decode(
              CardLibrary,
              initLog.players[1].initDeckString
            )
            if (typeof p1String === 'string') {
              throw new Error('Invalid p1 deckstring')
            }
            this.deckData = {
              deckStrings: [
                {
                  player: 0,
                  data: encode(
                    VERSION,
                    secrets[0].secret.filledDeck,
                    p0String[1]
                  )
                },
                {
                  player: 1,
                  data: encode(
                    VERSION,
                    secrets[1].secret.filledDeck,
                    p1String[1]
                  )
                }
              ],
              deckVersion: [
                { player: 0, data: VERSION },
                { player: 1, data: VERSION }
              ],
              deckType: [
                {
                  player: 0,
                  data:
                    initLog.players[0].initDeckString.length < 8
                      ? DeckType.RANDOM
                      : DeckType.CUSTOM
                },
                {
                  player: 1,
                  data:
                    initLog.players[1].initDeckString.length < 8
                      ? DeckType.RANDOM
                      : DeckType.CUSTOM
                }
              ]
            }
          }

          this.matchData.matchEndTimeStamp = this.lastActionAppliedTime
          this.matchData = {
            ...this.matchData,

            durationInSec:
              getTimeInSeconds(this.matchData.matchEndTimeStamp) -
              getTimeInSeconds(this.matchData.matchStartTimeStamp),
            dataUploadTimeStamp: new Date(),
            turnCount: state.state.turnCount,
            moveCount: state.state.moveCount,

            p0DeckString: this.deckData.deckStrings[0].data,
            p0DeckVersion: this.deckData.deckVersion[0].data,
            p0DeckType: this.deckData.deckType[0].data,
            p1DeckString: this.deckData.deckStrings[1].data,
            p1DeckVersion: this.deckData.deckVersion[1].data,
            p1DeckType: this.deckData.deckType[1].data,

            gameStateData: this.gameStateData,
            moveData: this.moveData,
            winner:
              state.state.status.type === 'GameOver'
                ? state.state.status.winner ?? 2
                : undefined
          }
        }
      }
    } finally {
      try {
        store.free()
      } catch (err) {
        console.warn('Hmm... failed to free the store: ', err)
      }
    }
  }
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

function decodeDeckstringOrPanic(deckstring: string): BaseCard[] {
  const s = decode(CardLibrary, deckstring)
  if (typeof s === 'string') {
    throw new Error(`Failed to decode deckstring: ${deckstring}\n${s}`)
  }
  return s[2] as BaseCard[]
}
