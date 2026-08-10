import { invoke } from '@tauri-apps/api'
import { useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { uiJsonModel } from '../layout'
import { store } from '../stores/designData'
import { UserSettings, userSettings } from '../stores/userSettings'

export function Tools() {
  const { brainstorm, theme, assetsMode } = useSnapshot(userSettings)

  const {
    value: { assetsHash }
  } = useSnapshot(store)
  const setAssetsMode = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    userSettings.assetsMode = e.target.value as UserSettings['assetsMode']
  }, [])
  return (
    <div
      style={{
        width: '100vw',
        height: '128px',
        background: 'var(--background)',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around'
      }}
    >
      <button
        className="themed"
        onClick={() => {
          userSettings.theme = userSettings.theme === 'light' ? 'dark' : 'light'
        }}
      >
        {theme === 'dark' ? '🌙' : '☀️'} toggle theme
      </button>
      <button
        className="themed"
        onClick={() => {
          userSettings.brainstorm = !userSettings.brainstorm
        }}
      >
        {brainstorm ? '🧠 BRAINSTORM IS ON' : '👀'} toggle brainstorm
      </button>
      <button className="themed" onClick={() => window.location.reload()}>
        reload
      </button>
      {!window.STATIC_DESIGN_DATA && (
        <button className="themed" onClick={() => invoke('open_db_folder')}>
          Open DB Folder
        </button>
      )}
      <button
        className="themed"
        onClick={() => {
          userSettings.uiJsonModel = JSON.parse(JSON.stringify(uiJsonModel))
        }}
      >
        reset layout to default
      </button>
      <button
        className="themed"
        onClick={() => {
          // eslint-disable-next-line no-console
          console.log(userSettings.uiJsonModel)
        }}
      >
        log layout model to console
      </button>
      <div>
        <label htmlFor="assetsMode">Assets config</label>
        <div>
          <input
            type="radio"
            name="assetsMode"
            value="remote"
            checked={assetsMode === 'remote'}
            onChange={setAssetsMode}
          />
          Remote
          <input
            type="text"
            value={assetsHash}
            onChange={(e) => {
              store.value.assetsHash = e.target.value
            }}
          />
        </div>
        <div>
          <input
            type="radio"
            name="assetsMode"
            value="local"
            checked={assetsMode === 'local'}
            onChange={setAssetsMode}
          />
          Local
        </div>
        <div>
          <input
            type="radio"
            name="assetsMode"
            value="compose"
            checked={assetsMode === 'compose'}
            onChange={setAssetsMode}
          />
          Compose
        </div>
      </div>
    </div>
  )
}
