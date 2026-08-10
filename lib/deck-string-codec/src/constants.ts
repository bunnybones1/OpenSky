export const VERSION = '02'
export const VERSION_LEN = 2
export const SW_PREFIX = 'SWx'
export const SW_PREFIX_LEN = 3
export const CLASS_LEN = 3

const a = new Uint32Array([0x12345678])
const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
export const isBigEndian = b[0] == 0x12
