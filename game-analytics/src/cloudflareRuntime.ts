import * as StateBindings from '@skyweaver/state-browser-sys'
import stateWasmModule from '@skyweaver/state-browser-sys/bindings_bg.wasm'

import type { AnalyticsMatchRuntimeConstructor } from './Match'

type WorkersStateBindings = typeof StateBindings & {
  __wbg_set_wasm(exports: WebAssembly.Exports): void
}

const bindings = StateBindings as WorkersStateBindings
let stateWasmInstance: WebAssembly.Instance | undefined

export const cloudflareAnalyticsRuntime = (): AnalyticsMatchRuntimeConstructor => {
  if (!stateWasmInstance) {
    stateWasmInstance = new WebAssembly.Instance(stateWasmModule, {
      './bindings_bg.js': bindings
    })
    bindings.__wbg_set_wasm(stateWasmInstance.exports)
  }
  return bindings.WasmMatch
}
