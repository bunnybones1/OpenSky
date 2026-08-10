import { memo } from 'react'

import { useGetAssetContext } from '../hooks/useGetAssetContext'

interface FunctionChildProps {
  loading: boolean
  result?: string
}

type FunctionChild = (props: FunctionChildProps) => React.ReactElement<any> | null

interface Props {
  url: string
  children?: FunctionChild
  style?: React.CSSProperties
  className?: string
}

export const Asset = memo(({ children: Children, url, style, className }: Props) => {
  const { getAssetUrl } = useGetAssetContext()

  const result = !!getAssetUrl ? getAssetUrl(url) : undefined

  if (typeof Children === 'function') {
    // @ts-ignore
    return Children({ result, loading: !getAssetUrl })
  }

  return <img src={result} style={style} className={className} />
})

Asset.displayName = 'Asset'
