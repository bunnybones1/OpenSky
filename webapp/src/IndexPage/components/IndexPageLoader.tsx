import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IndexPageLoaderLogo, IndexPageLoaderStyle } from './IndexPageLoader.css'

export const IndexPageLoader = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'fixed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }),
        IndexPageLoaderStyle
      )}
    >
      <svg
        height="200px"
        viewBox="0 0 36 62"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        className={IndexPageLoaderLogo}
      >
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <g transform="translate(-14.000000, -1.000000)" fill="#FFFFFF">
            <path
              d="M32,1 L20.8572507,12.1941602 L18.2854987,14.7777778 L14,19.0841862 L14,44.9158138 L32,63 L43.1427493,51.8058398 L45.7156333,49.2210851 L50,44.9158138 L50,19.0841862 L32,1 Z M34.5728839,38.0280621 L38.0003773,34.5836176 L40.5721293,32 L32,23.3883203 L23.2818513,14.6288104 L32,5.87043762 L46.5725066,20.5101794 L46.5725066,43.4898206 L43.2899006,46.7864348 L34.5728839,38.0280621 Z M17.4286253,43.4898206 L17.4286253,20.5101794 L20.7100994,17.2135652 L29.428248,25.9719379 L25.9996227,29.4163824 L23.4290026,32 L32,40.6116797 L40.7192806,49.3711896 L32,58.1295624 L17.4286253,43.4898206 Z"
              id="Fill-1"
              transform="translate(32.000000, 32.000000) scale(-1, 1) translate(-32.000000, -32.000000) "
            />
          </g>
        </g>
      </svg>
    </div>
  )
})

IndexPageLoader.displayName = 'IndexPageLoader'
