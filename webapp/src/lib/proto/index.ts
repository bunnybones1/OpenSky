export * from '@opensky/proto'

import { SkyWeaverAPI as BaseSkyWeaverAPI } from '@opensky/proto'

import env from '~/env'

const SKYWEAVER_JWT_KEY = '_opensky.api.jwt'

export class SkyWeaverAPIClient extends BaseSkyWeaverAPI {
  private _authToken?: string
  private _headers: { [key: string]: any }

  constructor(hostname: string, authToken?: string) {
    super(hostname.endsWith('/') ? hostname.slice(0, -1) : hostname, fetch)

    this._headers = {}
    this._authToken = authToken

    // TODO(future fix), see webrpc https://github.com/webrpc/webrpc/pull/103
    this.fetch = (a, b) => this._fetch(a, b)

    // set jwt if available
    this.authToken = window.localStorage.getItem(SKYWEAVER_JWT_KEY) || undefined
  }

  get authToken(): string | undefined {
    return this._authToken
  }

  set authToken(authToken: string | undefined) {
    this._headers = {}
    this._authToken = authToken

    this._headers['Release'] = env.GITCOMMIT
    if (this.authToken && this.authToken.length > 0) {
      this._headers['Authorization'] = `BEARER ${this.authToken}`
    }
  }

  _fetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    // Headers
    init!.headers = { ...init!.headers, ...this._headers }

    // Request
    const response = await window.fetch(input, init)

    if (!response.ok) {
      const text = await response.text()
      try {
        const errorPayload = JSON.parse(text)
        throw new Error(errorPayload)
      } catch (err) {
        throw new Error(text)
      }
    }

    return response
  }
}
