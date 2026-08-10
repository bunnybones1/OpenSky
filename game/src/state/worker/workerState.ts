import { BotWorkerState } from './botWorkerState'
import { MultiplayerWorkerState } from './multiplayerWorkerState'
import { ReplayWorkerState } from './replayWorkerState'
import { InitWorkerState } from './types'

export type WorkerState =
  | InitWorkerState
  | BotWorkerState<any>
  | MultiplayerWorkerState
  | ReplayWorkerState
