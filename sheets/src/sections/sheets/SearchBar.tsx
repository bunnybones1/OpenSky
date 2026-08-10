import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useKey } from 'react-use'

export const SearchBar = forwardRef(function SearchBar(
  {
    value,
    onChange,
    nextResult,
    numResults,
    prevResult,
    resultIndex,
    isCaseSensitive,
    setIsCaseSensitive
  }: {
    value: string | null
    numResults: number
    resultIndex: number
    onChange: (v: string | null) => void
    nextResult: () => void
    prevResult: () => void
    isCaseSensitive: boolean
    setIsCaseSensitive: (v: boolean) => void
  },
  outerRef: React.Ref<HTMLInputElement>
) {
  const ref = useRef<HTMLInputElement>(null)

  // trust me, i'm a dolphin.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  useImperativeHandle(outerRef, () => ref.current!)

  const wasOpen = useRef(false)
  useKey(
    'Escape',
    () => {
      if (ref.current === document.activeElement) {
        onChange(null)
      }
    },
    {},
    [ref]
  )
  useEffect(() => {
    if (value !== null && !wasOpen.current) {
      ref.current?.focus()
      ref.current?.select()
    }
    wasOpen.current = value !== null
  })
  return (
    <div
      style={{
        display: value === null ? 'none' : 'flex',
        alignItems: 'center',
        padding: '4px'
      }}
    >
      <button onClick={() => onChange(null)}>
        <span role="img" aria-label="close">
          X
        </span>
      </button>
      <input
        ref={ref}
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) {
              prevResult()
            } else {
              nextResult()
            }
          }
        }}
      />
      <button onClick={prevResult} disabled={numResults === 0}>
        ⬆
      </button>
      <button onClick={nextResult} disabled={numResults === 0}>
        ⬇
      </button>
      <label>
        <input
          type="checkbox"
          checked={isCaseSensitive}
          onChange={(e) => setIsCaseSensitive(e.target.checked)}
        />
        match case
      </label>
      <span
        style={{
          paddingLeft: '8px'
        }}
      >
        {numResults > 0
          ? `${resultIndex + 1} of ${numResults} matches`
          : 'no matches'}
      </span>
    </div>
  )
})
