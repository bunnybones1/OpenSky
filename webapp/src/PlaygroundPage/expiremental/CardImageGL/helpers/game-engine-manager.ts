import { GameEngineController } from '@opensky/shared/GameEngineController'

import env from '~/env'

type GameEngineCallback = (gec: GameEngineController) => void

let swGameEngineController: GameEngineController | undefined

class GameEngineManager {
  private _callbacks: GameEngineCallback[] = []
  private _initd: boolean
  private _ready: boolean
  private async _init() {
    if (this._initd) {
      return
    }
    this._initd = true
    if (!swGameEngineController) {
      for (const bundleName of ['vendor', 'main'] as const) {
        const tag = window.document.createElement('script')
        tag.type = 'text/javascript'
        // tag.charset = 'utf-8'
        tag.id = 'testing'
        tag.defer = true
        tag.async = true
        tag.setAttribute('src', `${env.GAME_URL}/${bundleName}.js`)
        await new Promise<void>((resolve) => {
          tag.onload = () => {
            resolve()
          }
          window.document.head.appendChild(tag)
        })
      }
    }

    swGameEngineController = (window as any)
      .swGameEngineController as GameEngineController

    for (const callback of this._callbacks) {
      callback(swGameEngineController)
    }
    this._callbacks.length = 0
    this._ready = true
  }
  onReady(cb: GameEngineCallback) {
    this._init()
    if (this._ready) {
      cb(swGameEngineController!)
    } else {
      this._callbacks.push(cb)
    }
  }
}

let gameEngineManager: GameEngineManager | undefined

export function getGameEngineController(cb: GameEngineCallback) {
  if (!gameEngineManager) {
    gameEngineManager = new GameEngineManager()
  }
  gameEngineManager.onReady(cb)
}
