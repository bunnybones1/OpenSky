import { FindByType } from '@opensky/shared/typeHelpers'

import { MessageToWorker } from '../StateSharedTypes'

export type WorkerError =
  | object
  | Error
  | string
  | {
      message: any
      error: Error | string | object
    }

export interface InitWorkerState {
  type: 'init'
}

export type InitMessage = FindByType<MessageToWorker, 'Init'>
export type SwWasm = Awaited<typeof import('@skyweaver/state-browser-sys')>
export type { WasmMatch, WasmState } from '@skyweaver/state-browser-sys'
