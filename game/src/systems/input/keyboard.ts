import {
  cleanRemoveFromArrayMap,
  pushToArrayMap
} from '@opensky/shared/utils/arrayUtils'
class KeyboardInput {
  private keyListeners = new Map<KeyboardKey, Array<() => void>>()
  private keysBeingPressed = new Set<KeyboardKey>()
  constructor() {
    window.addEventListener('keydown', ev => {
      const key = ev.key as KeyboardKey
      if (!this.keysBeingPressed.has(key)) {
        this.keysBeingPressed.add(key)
        if (this.keyListeners.has(key)) {
          for (const callback of this.keyListeners.get(key)!) {
            callback()
          }
        }
      }
    })
    window.addEventListener('keyup', ev => {
      this.keysBeingPressed.delete(ev.key as KeyboardKey)
    })
  }
  listenToKey(key: KeyboardKey, callback: () => void) {
    pushToArrayMap(this.keyListeners, key, callback)
  }
  stopListeningToKey(key: KeyboardKey, callback: () => void) {
    cleanRemoveFromArrayMap(this.keyListeners, key, callback)
  }
  stopListeningToAllKeys() {
    this.keyListeners = new Map()
  }
}

export default new KeyboardInput()

// Keys are from https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
type NumericKeypadKeys =
  | 'Decimal'
  | 'Key11'
  | 'Key12'
  | 'Multiply'
  | 'Add'
  | 'Clear'
  | 'Divide'
  | 'Subtract'
  | 'Separator'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
type UpperAlpha =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
type LowerAlpha =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
type SpecialCharKeys =
  | '`'
  | '!'
  | '@'
  | '#'
  | '$'
  | '%'
  | '^'
  | '&'
  | '*'
  | '('
  | ')'
  | '-'
  | '_'
  | '+'
  | '='
  | '['
  | ']'
  | '{'
  | '}'
  | '|'
  | '\\'
  | ';'
  | ':'
  | "'"
  | '"'
  | ','
  | '.'
  | '/'
  | '<'
  | '>'
  | '?'
type ModifierKeys =
  | 'Alt'
  | 'AltGraph'
  | 'CapsLock'
  | 'Control'
  | 'Fn'
  | 'FnLock'
  | 'Hyper'
  | 'Meta'
  | 'NumLock'
  | 'ScrollLock'
  | 'Shift'
  | 'Super'
  | 'Symbol'
  | 'SymbolLock'
type WhitespaceKeys = 'Enter' | 'Tab' | ' '
type NavigationKeys =
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'End'
  | 'Home'
  | 'PageDown'
  | 'PageUp'
type EditingKeys =
  | 'Backspace'
  | 'Clear'
  | 'Copy'
  | 'CrSel'
  | 'Cut'
  | 'Delete'
  | 'EraseEof'
  | 'ExSel'
  | 'Insert'
  | 'Paste'
  | 'Redo'
  | 'Undo'
type UIKeys =
  | 'Accept'
  | 'Again'
  | 'Attn'
  | 'Cancel'
  | 'ContextMenu'
  | 'Escape'
  | 'Execute'
  | 'Find'
  | 'Finish'
  | 'Help'
  | 'Pause'
  | 'Play'
  | 'Props'
  | 'Select'
  | 'ZoomIn'
  | 'ZoomOut'
type FunctionKeys =
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'F13'
  | 'F14'
  | 'F15'
  | 'F16'
  | 'F17'
  | 'F18'
  | 'F19'
  | 'F20'
  | 'Soft1'
  | 'Soft2'
  | 'Soft3'
  | 'Soft4'
type KoreanKeyboardsOnly = 'HangulMode' | 'HanjaMode' | 'JunjaMode'

type SpecialValueKey = 'Unidentified'

export type KeyboardKey =
  | SpecialValueKey
  | ModifierKeys
  | WhitespaceKeys
  | NavigationKeys
  | EditingKeys
  | UIKeys
  | FunctionKeys
  | NumericKeypadKeys
  | UpperAlpha
  | LowerAlpha
  | SpecialCharKeys
  | KoreanKeyboardsOnly
