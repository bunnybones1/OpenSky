import { hasActiveCardSelection } from './cardSelectionUiState'

describe('card-selection UI state', () => {
  it('does not update a deferred replay UI callback after reconstruction clears the selection', () => {
    expect(hasActiveCardSelection(true, undefined)).toBe(false)
  })

  it('updates only an enabled selection', () => {
    expect(hasActiveCardSelection(false, {})).toBe(false)
    expect(hasActiveCardSelection(true, {})).toBe(true)
  })
})
