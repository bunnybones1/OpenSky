import { ThemeProvider } from '@emotion/react'
import { memo } from 'react'
import { HistoryRouter as Router } from 'redux-first-history/rr6'

import { Theme } from '~/__deprecated__/style/Theme'
import App from '~/App'
import { history } from '~/shared/redux'

const AuthenticatedAppWrapper = memo(() => {
  return (
    <ThemeProvider theme={Theme}>
      <Router history={history}>
        <App />
      </Router>
    </ThemeProvider>
  )
})

AuthenticatedAppWrapper.displayName = 'AuthenticatedAppWrapper'

export default AuthenticatedAppWrapper
