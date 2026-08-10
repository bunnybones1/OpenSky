import {
  Account,
  DeckClass,
  GetMatchArchiveRecordsURIReturn,
  MatchStatus
} from '@opensky/proto'
import { CODE_PRISMS } from '@opensky/shared/constants'
import { EmoteMessage } from '@opensky/shared/game-server-message-types'
import * as mode from '@opensky/shared/gameModes'
import { MatchLog, MatchLogStateInit } from '@opensky/shared/matchLog'
import { clamp } from '@opensky/shared/utils/math'
import {
  Player,
  PlayerSecret,
  Prism,
  SkyWeaver
} from '@skyweaver/state-metadata'

import apiClient from '~/apiClient'
import { debugAccounts } from '~/debugAccounts'
import env from '~/env'
import queryParams from '~/queryParams'
import { globalAccess } from '~/utils/globalAccess'
import { changeUrlParamAndReload } from '~/utils/location'
import { padLeadingZeros } from '~/utils/stringUtils'

import { store } from '.'
import { Frame, Record } from './StateRecorder'
import { ReplayPlayer } from './StateSharedTypes'

class StatePlayer {
  _frameIndex: number = -1
  _time: number = 0
  private _speedMultiplier: number = 1
  isPlaying: boolean = false
  record: Record | null

  get speedMultiplier(): number {
    return this._speedMultiplier
  }
  set speedMultiplier(value: number) {
    this._speedMultiplier = value
  }
  get frameIndex() {
    return this._frameIndex
  }

  set frameIndex(value: number) {
    const frame = this.record && this.record.frames[value]

    if (this.record && frame) {
      this._frameIndex = value
      this.time = frame.time
    }
  }

  get time() {
    return this._time
  }

  set time(value: number) {
    if (value === this.time) {
      return
    }
    if (this.record) {
      this._time = clamp(
        value,
        this.record.firstFrameTime,
        this.record.frames[this.record.frames.length - 1].time + 1000
      )
      if (globalAccess.ui) {
        globalAccess.ui.getContainer('replay').slider.parameter.value =
          (this.time - this.record.firstFrameTime) / this.recordDuration()
      }
    }
  }

  async load(matchID: number, replayID: string, localPlayer: Player, time = 0) {
    console.log('Loading match', matchID)

    let matchStatus: MatchStatus = MatchStatus.UNKNOWN
    let winningPlayer: number | undefined = undefined
    try {
      const record: GetMatchArchiveRecordsURIReturn = queryParams.loadTestReplay
        ? {
            ok: true,
            recordURIs: [0, 1, 2, 3, 4, 5, 6].map(
              n => env.ASSETS_URL + `/game/sample-replays/000${n}.json`
            ),
            archiveIndexURI: ''
          }
        : await apiClient.getMatchArchiveRecordsURI({ matchID, replayID })
      const [initLog]: [MatchLogStateInit] = await fetch(
        record.recordURIs[0]
      ).then(r => r.json())
      // set the correct island
      if (mode.isConquestGame(initLog.gameMode)) {
        if (queryParams.island !== 'Conquest1') {
          changeUrlParamAndReload('island', 'Conquest1')
        }
      } else {
        // is not conquest gamemode
        if (queryParams.island === 'Conquest1') {
          changeUrlParamAndReload('island', '')
        }
      }
      const frames: Frame[] = []
      const diffs: Array<Array<string> | EmoteMessage> = []
      const gameStartTime = Date.parse(initLog.timestamp as unknown as string)
      for (let i = 1; i < record.recordURIs.length; i++) {
        const archiveRecords: MatchLog[] = await fetch(
          record.recordURIs[i]
        ).then(r => r.json())
        for (const record of archiveRecords) {
          let time: number | undefined
          if ('timestamp' in record) {
            time = Date.parse(record.timestamp as unknown as string)
            // Workaround for dev re-using match IDs
            // Dev envs might upload to the same S3 path as another old match,
            // so if our replay suddenly jumps into the past,
            // stop reading it.
            if (time < gameStartTime) {
              console.warn(
                'Dev replay bug workaround: Replay jumped into the past, ignoring further frames.'
              )
              break
            }
          }
          if (record.type === 'noop' && record.message.type === 'emote') {
            if (!time) {
              throw new Error("record doesn't have timestamp in it!")
            }

            frames.push({
              time,
              type: 'emote'
            })

            diffs.push(record.message)
          }
          if (
            record.type === 'gameplay' &&
            record.message.type === 'gameplay'
          ) {
            if (!time) {
              throw new Error("record doesn't have timestamp in it!")
            }

            let type: Frame['type'] = 'internal'
            if (
              record.difflog &&
              record.difflog.some(d => d.includes('Play(Play('))
            ) {
              if (record.difflog.some(d => d.includes('Play(Play(EndTurn'))) {
                type = 'playerActionEndTurn'
              } else {
                type = 'playerAction'
              }
            }
            frames.push({
              time,
              type
            })
            diffs.push(record.message.data)
          }
        }
      }

      let accounts: (Account & {
        deckClass: DeckClass
        deckString: string
        heroSkinID: number | undefined
        cardBackID: number | undefined
      })[]
      if (record.match) {
        matchStatus = record.match.status
        winningPlayer = record.match.winningPlayer
        const { player1, player2, player1DeckClass, player2DeckClass } =
          record.match
        accounts = [
          {
            ...player1,
            locale: 'en',
            warmUps: 0,
            createdAt: '',
            updatedAt: '',
            experience: 0,
            level: 0,
            seasonLevel: 0,
            levelUpXP: 0,
            deckClass:
              player1.deckClass || player1DeckClass || DeckClass.UNKNOWN_CLASS,
            stats: initLog.players[0].stats,
            heroSkinID: initLog.players[0].heroSkinID,
            cardBackID: initLog.players[0].cardBackID
          },
          {
            ...player2,
            locale: 'en',
            warmUps: 0,
            createdAt: '',
            updatedAt: '',
            experience: 0,
            level: 0,
            seasonLevel: 0,
            levelUpXP: 0,
            deckClass:
              player2.deckClass || player2DeckClass || DeckClass.UNKNOWN_CLASS,
            stats: initLog.players[1].stats,
            heroSkinID: initLog.players[1].heroSkinID,
            cardBackID: initLog.players[1].cardBackID
          }
        ]
      } else {
        try {
          // todo could load these prisms from the serialized game...
          console.log('No accounts in match, loading from API. Unknown prisms.')
          accounts = await Promise.all(
            initLog.players.map(async player =>
              apiClient
                .getAccount({
                  address: player.id
                })
                .then(account => ({
                  ...account.account,
                  deckClass: DeckClass.UNKNOWN_CLASS,
                  deckString: player.initDeckString,
                  heroSkinID: player.heroSkinID,
                  cardBackID: player.cardBackID
                }))
            )
          )
        } catch (err) {
          console.warn(
            'Failed to load accounts, continuing offline. unknown prisms.'
          )
          accounts = initLog.players.map((p, i: 0 | 1) => ({
            ...debugAccounts[i],
            name: p.name,
            address: p.id,
            deckClass: DeckClass.UNKNOWN_CLASS,
            deckString: p.initDeckString,
            heroSkinID: p.heroSkinID,
            cardBackID: p.cardBackID
          }))
        }
      }
      const makePlayer = (id: number): ReplayPlayer => ({
        account: {
          ...accounts[id],
          prisms: CODE_PRISMS[accounts[id].deckClass].map(
            p => p.toLowerCase() as Prism
          ),
          deckEquipment: {
            stickers: [],
            heroSkin: accounts[id].heroSkinID,
            cardBack: accounts[id].cardBackID
          }
        },
        secret: [
          initLog.secrets[id][0],
          Uint8Array.from(initLog.secrets[id][1])
        ] as [PlayerSecret<SkyWeaver>, Uint8Array],
        deckString: accounts[id].deckString
      })
      const firstFrameTime = frames[0].time - 1
      this.record = {
        id: matchID,
        name: `${initLog.players.map(p => p.name).join(' vs ')}`,
        firstFrameTime,
        rootProof: initLog.rootProof,
        players: [makePlayer(0), makePlayer(1)],
        frames,
        localPlayer,
        status: matchStatus,
        winningPlayer,
        gameMode: initLog.gameMode,
        replayID: replayID,
        version: initLog.version
      }

      await store.loadReplay(
        this.record.id,
        this.record.rootProof,
        diffs,
        this.record.players,
        this.record.localPlayer
      )
      const duration = this.recordDuration()
      const replay = globalAccess!.ui!.getContainer('replay')
      await replay.ready
      replay.slider.setTickMarks(
        frames.map(frame => ({
          type: frame.type,
          matchPercentTime: (frame.time - firstFrameTime) / duration
        }))
      )
      await this.cue(time - 1)
    } catch (err) {
      const error =
        err instanceof Error
          ? `${err.name}: ${err.message}\n`
          : typeof err === 'object' &&
            typeof err.error === 'object' &&
            typeof err.error.error === 'string'
          ? (err.error.error as string)
          : JSON.stringify(err)
      const isOutdatedReplayError = error.includes('data[..size] != *version')
      if (isOutdatedReplayError && this.record?.version) {
        // Load old client :)
        window.location.href = window.location.href.replace(
          env.GITCOMMIT,
          this.record.version
        )
        return
      }
      console.error(
        `Failed to load match ${matchID} with status ${matchStatus}.`,
        err
      )
      store.fireClientError(
        new Error(
          `Failed to load match ${matchID} with status ${matchStatus}.\n${error}`
        )
      )
    }

    return this.record
  }

  update(dt: number) {
    if (this.isPlaying && this.record) {
      const nextFrame = this.record.frames[this.frameIndex + 1]
      if (nextFrame) {
        this.time += dt * 1000 * this._speedMultiplier
        if (this.time > nextFrame.time) {
          this.frameIndex += 1
          store.goToReplayFrame(this.frameIndex, 'play')
        }
      }
      const hudContainer = globalAccess.ui!.getContainer('hud')
      hudContainer.buttonSettings.highlight =
        this.record.frames.length - 1 == this.frameIndex
    }
  }
  goForwards() {
    if (this.record) {
      const nextFrame = this.record.frames.findIndex(
        f => f.type !== 'internal' && f.time > this.time
      )
      if (nextFrame === -1) {
        return
      }
      this.frameIndex = nextFrame
      store.goToReplayFrame(this.frameIndex, 'play')
      this.time = this.record.frames[this.frameIndex].time
    }
  }
  goBackwards() {
    if (this.record) {
      const currFrameIndex = this.record.frames
        .slice()
        .reverse()
        .findIndex(
          f =>
            f.type !== 'internal' &&
            f.time < this.time - 500 * this.speedMultiplier
        )
      if (currFrameIndex > 0) {
        const prevFrame =
          this.record!.frames[this.record.frames.length - currFrameIndex - 1]
        this.cue(prevFrame.time - 1)
      } else {
        this.cue(this.record.firstFrameTime)
      }
    }
  }

  pause() {
    console.log('Pausing replay playback.')
    this.isPlaying = false
  }

  play() {
    console.log('Resuming replay playback.')
    this.isPlaying = true
  }

  playPause() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  async cue(cueTime: number) {
    if (!this.record) {
      console.warn('Cue called, but no replay loaded.')
      return
    }
    const cueFrame = this.record.frames.findIndex(
      f => f.type !== 'internal' && f.time > cueTime
    )
    if (cueFrame === -1) {
      const lastFrameIndex = this.record.frames.length - 1
      this.frameIndex = lastFrameIndex
      this.time = this.record.frames[lastFrameIndex].time
    } else {
      this.frameIndex = cueFrame - 1
      this.time = cueTime
    }

    await store.goToReplayFrame(this.frameIndex, 'jump')
  }
  recordDuration() {
    if (!this.record) {
      return 1
    }
    return (
      Math.abs(
        this.record.frames[this.record.frames.length - 1].time -
          this.record.firstFrameTime
      ) + 1000 // add 1 second at the end to let the final move be played
    )
  }
}
export function getTimeString(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds - m * 60)

  return `${padLeadingZeros(m)}:${padLeadingZeros(s)}`
}

export const statePlayer = new StatePlayer()
