import { isNativeMobileApp } from '@opensky/shared/native'
import { useEvent } from 'react-use'

export const useMuteAudioOnVisibilityChange = () => {
  useEvent('visibilitychange', () => {
    if (isNativeMobileApp()) {
      if (document.visibilityState === 'hidden') {
        Howler.mute(true)
      } else {
        Howler.mute(false)
      }
    }
  })
}
