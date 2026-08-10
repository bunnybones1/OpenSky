import * as wasm from "./bindings_bg.wasm";
import { __wbg_set_wasm } from "./bindings_bg.js";
__wbg_set_wasm(wasm);
export * from "./bindings_bg.js";
