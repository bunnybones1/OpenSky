import './console.css'

import { useSnapshot } from 'valtio'

import { consoleHistory } from '../stores/consoleHistory'

export function Console() {
  const scrollback = useSnapshot(consoleHistory)

  return (
    <div style={{ padding: '16px' }}>
      {scrollback.map((line, i) => (
        <div key={i} className={`console-line ${line.type}`}>
          <span className="timestamp">
            {new Date(line.timestamp).toLocaleTimeString('en-US')}
          </span>
          {line.message.map((part, i) => (
            <pre key={i}>
              {typeof part === 'string' ||
              typeof part === 'boolean' ||
              typeof part === 'bigint' ||
              typeof part === 'number'
                ? `${part}`
                : part instanceof Error
                ? `${part.name}\n${part.message}\n${part.stack}`
                : JSON.stringify(part, null, 2)}
            </pre>
          ))}
        </div>
      ))}
    </div>
  )
}
