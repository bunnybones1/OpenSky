import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'

export const lightCacheFudgeModeToggle = new NiceBooleanParameter(
  'light-probe-fudge-mode',
  'Light Probe Fudge Mode',
  false,
  'graphics',
  v => (v ? 'simple' : 'sqrt'),
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0,
  true
)

export function toggleLightCacheFudgeMode() {
  lightCacheFudgeModeToggle.value = !lightCacheFudgeModeToggle.value
  setTimeout(() => location.reload(), 200)
}
