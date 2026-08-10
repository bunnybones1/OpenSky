import env from '~/env'

const getProxyServerUrl = () => {
  const RE_PROXY_SERVER_URL = /proxyServerUrl=(.+)/gi

  const match = RE_PROXY_SERVER_URL.exec(window.navigator.userAgent.toLowerCase())

  if (!match) {
    return null
  }

  return match[1] || null
}

export const getAssetsUrlPrefix = () => {
  if (!!getProxyServerUrl()) {
    return `${getProxyServerUrl()}?path=${env.ASSETS_URL}`
  }

  return env.ASSETS_URL
}
