import { proxy, subscribe } from 'valtio'

import { uiJsonModel } from '../layout'
import { LayoutComponent } from '../types'
import { IJsonModel } from '../validateModel'

export interface UserSettings {
  theme: 'light' | 'dark'
  uiJsonModel: IJsonModel<LayoutComponent>
  brainstorm: boolean
  assetsMode: 'local' | 'compose' | 'remote'
}
const USER_STORAGE = 'sheets-user-settings-1.0'

export const userSettings = proxy<UserSettings>(
  JSON.parse(
    localStorage.getItem(USER_STORAGE) ??
      JSON.stringify({
        theme: 'light',
        brainstorm: false,
        uiJsonModel,
        assetsMode: 'remote'
      } satisfies UserSettings)
  )
)
subscribe(userSettings, () => {
  localStorage.setItem(USER_STORAGE, JSON.stringify(userSettings))
})
