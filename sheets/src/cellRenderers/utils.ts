import { RenderCellProps, RenderEditCellProps } from 'react-data-grid'

export function getAssetUrl(path: string): string {
  return `http://localhost:4001/${path}`
}

export type RCProps = {
  column: {
    readonly key: string
  }
  row: Record<string, unknown>
  isCellEditable?: boolean
  onRowChange?: (row: Record<string, unknown>) => void
}

export type RCEditProps = {
  column: { readonly key: string }
  row: Record<string, unknown>
  onRowChange: (row: Record<string, unknown>) => void
  onClose: (commitChanges?: boolean, shouldFocusCell?: boolean) => void
}

function _never() {
  // assert assignability
  const x: RenderCellProps<any> = {} as any
  const y: RCProps = x
  void y

  const v: RenderEditCellProps<any> = {} as any
  const w: RCEditProps = v
  void w
}
void _never

export function textColorForBG(r: number, b: number, g: number) {
  const brightness = Math.round((r * 299 + g * 587 + b * 114) / 1000)
  return brightness > 125 ? 'black' : 'white'
}
