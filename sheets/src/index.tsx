import 'core-js/stable'
import 'react-data-grid/lib/styles.css'
import 'react-loading-skeleton/dist/skeleton.css'
import './react-select-search-style.css'
import './style.css'
import 'react-contexify/dist/ReactContexify.css'

import { StrictMode, Suspense } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { GetAssetProvider } from './assets/GetAssetProvider'

const container = document.getElementById('app')
if (!container) {
  throw new Error('no app div!')
}
const root = createRoot(container)

root.render(
  <StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <DndProvider backend={HTML5Backend}>
        <GetAssetProvider>
          <App />
        </GetAssetProvider>
      </DndProvider>
    </Suspense>
  </StrictMode>
)
