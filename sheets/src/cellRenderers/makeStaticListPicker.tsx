import SelectSearch, { SelectSearchOption } from 'react-select-search'

import { RCEditProps } from './utils'

export function makeStaticListPicker(
  options: SelectSearchOption[],
  config?: { allowNull?: boolean; allowMultiple?: boolean }
) {
  return function StaticListPicker({ row, column, onRowChange }: RCEditProps) {
    const key = column.key as keyof typeof row
    const val = row[key]
    return (
      <div className="select-on-top">
        <SelectSearch
          autoFocus
          search
          fuzzySearch
          multiple={config?.allowMultiple}
          options={[
            ...(config?.allowNull
              ? [
                  {
                    name: 'No Value',
                    value: undefined
                  }
                ]
              : []),
            ...options
          ]}
          value={
            config?.allowMultiple ? (Array.isArray(val) ? val : [`${val}`]) : `${val}`
          }
          onChange={(value) => {
            onRowChange({
              ...row,
              [key]: config?.allowMultiple
                ? Array.isArray(value)
                  ? [...value]
                  : [value]
                : Array.isArray(value)
                ? value[0]
                : value === null && config?.allowNull
                ? undefined
                : value
            })
          }}
        />
      </div>
    )
  }
}
