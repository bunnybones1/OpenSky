import { Component } from 'react'
import * as React from 'react'
import { Trans } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Portal } from '~/shared/components/Portal'
import { captureError } from '~/shared/helpers/sentry'

enum ErrorType {
  OUTDATED_BROWSER = 'OUTDATED_BROWSER',
  GENERIC = 'GENERIC'
}

interface State {
  errorType: ErrorType | null
  redirect: boolean
}

// TODO: consider using react-error-boundary, but first check its dep/code

class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  static getDerivedStateFromError() {
    return { errorType: ErrorType.GENERIC, redirect: false }
  }

  state = {
    errorType: getHasProxySupport() ? null : ErrorType.OUTDATED_BROWSER,
    redirect: false
  }

  componentDidCatch(err) {
    const { errorType } = this.state
    captureError(err, 'Boundary error')
    if (errorType === ErrorType.GENERIC) {
      this.setState({ redirect: true })
    }
  }

  render() {
    const { errorType } = this.state

    return (
      <>
        {!errorType && this.props.children}

        {errorType && (
          <Portal>
            {errorType === ErrorType.OUTDATED_BROWSER && (
              <FlexBox
                position="fixed"
                height="100%"
                width="100%"
                zIndex={100}
                bg="purple5"
                alignItems="center"
                justifyContent="center"
              >
                <FlexBox flexDirection="column">
                  <Text
                    fontSize={32}
                    color="white"
                    fontWeight="bold"
                    textWrap={true}
                    textAlign="center"
                    as="h2"
                  >
                    <Trans i18nKey="unsupportedBrowser.browserNotSupported" />
                  </Text>

                  <Text pt={12} as="p" fontSize={24} color="white" textAlign="center">
                    <Trans i18nKey="support.pleaseDownloadEither" />{' '}
                    <a
                      href="https://www.google.com/chrome/"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: '#fff',
                        textDecoration: 'underline'
                      }}
                    >
                      <Trans i18nKey="unsupportedBrowser.chrome" />
                    </a>{' '}
                    <Trans i18nKey="support.or" />{' '}
                    <a
                      href="https://www.mozilla.org/en-CA/firefox/new/"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: '#fff',
                        textDecoration: 'underline'
                      }}
                    >
                      <Trans i18nKey="unsupportedBrowser.firefox" />
                    </a>
                    .
                  </Text>
                </FlexBox>
              </FlexBox>
            )}
          </Portal>
        )}
      </>
    )
  }
}

function getHasProxySupport() {
  /* eslint-disable */
  const _global =
    (typeof global !== 'undefined' && global) ||
    (typeof window !== 'undefined' && window) ||
    (typeof self !== 'undefined' && self) ||
    // @ts-ignore
    this

  if (typeof _global['Proxy'] === 'undefined') {
    return false
  }

  try {
    new _global['Proxy']({}, {})

    return true
  } catch {}

  /* eslint-enable */
  return false
}

export default ErrorBoundary
