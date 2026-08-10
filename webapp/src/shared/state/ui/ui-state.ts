import { proxy } from 'valtio'

interface UIState {
  isCookieDisclaimerHidden?: boolean
  isCacheDownloadInProgress: boolean
  isCacheQuotaExceeded: boolean
  isManifestLoaded: boolean
}

const DEFAULT_UI_STATE: UIState = {
  isCookieDisclaimerHidden: undefined,
  isCacheDownloadInProgress: false,
  isCacheQuotaExceeded: false,
  isManifestLoaded: false
}

export const uiState = proxy<UIState>(DEFAULT_UI_STATE)

export const updateUIState = <T extends keyof UIState>(key: T, value: UIState[T]) => {
  uiState[key] = value
}
