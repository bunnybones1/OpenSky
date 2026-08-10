import '@emotion/react'

import { ThemeInterface } from './__deprecated__/style/Theme'

declare module '@emotion/react' {
  // Lint error here, but disabling instead of fixing since we wont be using
  // emotion forever
  // eslint-disable-next-line
  export interface Theme extends ThemeInterface {}
}
