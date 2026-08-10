import { GlobalDataType } from '@opensky/design-data/schema'
import { i18nInit } from '@opensky/language-manager'
import { listen } from '@tauri-apps/api/event'
import { Actions, IJsonModel, Layout, Model, TabNode } from 'flexlayout-react'
import darkTheme from 'flexlayout-react/style/dark.css?inline'
import lightTheme from 'flexlayout-react/style/light.css?inline'
import { ReactNode, RefObject, useCallback, useEffect, useRef } from 'react'
import { initReactI18next } from 'react-i18next'
import { useMount, useUnmount } from 'react-use'
import { useSnapshot } from 'valtio'

import { LayoutContext, problemsTabID } from './layout'
import { Console } from './sections/Console'
// import { GlobalSearch } from './sections/GlobalSearch'
import { Problems } from './sections/Problems'
import { SheetPicker } from './sections/SheetPicker'
import { Sheet } from './sections/sheets/Sheet'
import { Tools } from './sections/Tools'
import {
  disableUpdatesWhileClosureRuns,
  store,
  validationStore
} from './stores/designData'
import { userSettings } from './stores/userSettings'
import { LayoutComponent } from './types'
import { Layout as TypedLayout } from './validateModel'

type MenuPayload = 'zoomin' | 'zoomout' | 'resetzoom' | 'find' | 'closetab'

export function App() {
  const handleGestureStart = useCallback((e: any) => {
    e.preventDefault()
  }, [])

  useMount(() => {
    document.addEventListener('gesturestart', handleGestureStart)
  })

  useUnmount(() => {
    document.removeEventListener('gesturestart', handleGestureStart)
  })

  useMount(async () => {
    await i18nInit({
      defaultNS: 'webapp',
      use: [initReactI18next],
      lng: 'en',
      version: ''
    })
  })

  return <HomePage />
}

function HomePage() {
  const { theme, uiJsonModel } = useSnapshot(userSettings)
  const layoutRef = useRef<TypedLayout<LayoutComponent>>(null)

  const uiModel = Model.fromJson(uiJsonModel as IJsonModel)
  const { errors } = useSnapshot(validationStore)

  const numValidationErrors = errors.length
  useEffect(() => {
    const problemsTabs = userSettings.uiJsonModel.borders?.map((b) =>
      b.children.find((t) => t.id === problemsTabID)
    )
    if (problemsTabs) {
      const numProblems = validationStore.errors.length
      const problemsTabText = `${numProblems ? '❌' : '✅'} Problems (${numProblems})`
      for (const tab of problemsTabs) {
        if (tab) {
          tab.name = problemsTabText
        }
      }
    }
  }, [numValidationErrors, uiJsonModel])

  useEffect(() => {
    if (window.STATIC_DESIGN_DATA) {
      return
    }
    const unlistenPromises = Promise.all([
      listen<MenuPayload>('tauri://menu', (e) => {
        if (e.payload === 'closetab') {
          if (!layoutRef.current) {
            return
          }

          const focusedTabset = uiModel.getActiveTabset()
          if (!focusedTabset) {
            return
          }
          const focusedTab = focusedTabset.getSelectedNode()
          if (!focusedTab) {
            return
          }
          layoutRef.current.doAction(Actions.deleteTab(focusedTab.getId()))
        } else if (e.payload === 'find') {
          if (!layoutRef.current) {
            return
          }

          const focusedTabset = uiModel.getActiveTabset()
          if (!focusedTabset) {
            return
          }
          const focusedTab = focusedTabset.getSelectedNode()
          if (!focusedTab || !(focusedTab instanceof TabNode)) {
            return
          }

          const component = focusedTab.getComponent()
          if (component !== 'sheet') {
            return
          }
          layoutRef.current.doAction(
            Actions.updateNodeAttributes(focusedTab.getId(), {
              config: { ...focusedTab.getConfig(), ctrlFJustPressed: true }
            })
          )
        } else {
          const body = document.body.style as unknown as { zoom: `${number}%` }
          const bodyZoomNaN = Number.parseFloat(body.zoom)
          const bodyZoom = Number.isNaN(bodyZoomNaN) ? 100 : bodyZoomNaN
          if (e.payload === 'resetzoom') {
            body.zoom = '100%'
          } else if (e.payload === 'zoomin') {
            body.zoom = `${bodyZoom + 10}%`
          } else if (e.payload === 'zoomout') {
            body.zoom = `${Number.parseFloat(body.zoom) - 10}%`
          } else {
            const _never: never = e.payload
            void _never
          }
        }
      }),
      listen(
        'paths_updated',
        ({
          payload: paths
        }: {
          payload: Array<{ path: string; contents?: any }>
        }) => {
          disableUpdatesWhileClosureRuns(() => {
            for (const { path, contents } of paths) {
              setPathToJsonStringOrDelete(path, contents)
            }
          })
        }
      ),
      listen(
        'rename_path',
        ({ payload: [from, to] }: { payload: [string, string] }) => {
          let obj: any = store
          const fromPathSegments: any[] = from.split('/')
          const filename = fromPathSegments.pop()
          for (const seg of fromPathSegments) {
            if (!obj[seg]) {
              return
            }
            obj = obj[seg]
          }
          const oldObj = obj[filename]
          setPathToJsonStringOrDelete(from, null)
          setPathToJsonStringOrDelete(to, JSON.stringify(oldObj))
        }
      )
    ])

    return () => {
      unlistenPromises.then((ul) => ul.forEach((c) => c()))
    }
  })

  return (
    <div className={`theme-${theme}`}>
      <style>{theme === 'dark' ? darkTheme : lightTheme}</style>
      <LayoutContext.Provider value={layoutRef}>
        <Layout
          ref={layoutRef as unknown as RefObject<Layout>}
          model={uiModel}
          factory={uiFactory}
          onModelChange={(m) => {
            userSettings.uiJsonModel = m.toJson() as any
          }}
        />
      </LayoutContext.Provider>
      {/* <GlobalSearch /> */}
    </div>
  )
}

function uiFactory(node: TabNode): ReactNode {
  const comp = node.getComponent()
  if (!comp) {
    return null
  }

  const l = {
    component: comp,
    config: node.getConfig()
  } as LayoutComponent

  if (l.component === 'sheet_picker') {
    return <SheetPicker />
  } else if (l.component === 'sheet') {
    return <Sheet {...l.config} node={node} />
  } else if (l.component === 'tools') {
    return <Tools />
  } else if (l.component === 'problems') {
    return <Problems />
  } else if (l.component === 'console') {
    return <Console />
  } else {
    const comp: never = l
    return <div>Invalid Component: {JSON.stringify(comp)}</div>
  }
}

function setPathToJsonStringOrDelete(path: string, contents: any) {
  let obj: any = store.value satisfies GlobalDataType
  const pathSegments: any[] = path.split('/')
  const filename = pathSegments.pop()
  for (const seg of pathSegments) {
    if (!obj[seg]) {
      obj[seg] = {}
    }
    obj = obj[seg]
  }
  if (contents) {
    const val = JSON.parse(contents)
    if (obj[filename] !== val) {
      obj[filename] = val
    }
  } else {
    delete obj[filename]
  }
}
