import queryParams from '~/queryParams'
import { CursorType } from '~/systems/input/CursorType'

let _currentCursor: CursorType = 'default'
let _nextCursor: CursorType = 'default'

export function updateCursor() {
  if (_nextCursor !== _currentCursor) {
    _currentCursor = _nextCursor
    document.body.style.cursor =
      (queryParams.overrideCursor as CursorType) || _currentCursor || 'default'
  }
}

export function setNextMouseCursor(cursor: CursorType) {
  if (cursor !== 'default') {
    _nextCursor = cursor
  }
}

export function resetNextCursor() {
  _nextCursor = 'default'
}
