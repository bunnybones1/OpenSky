export function GradientValue({
  value,
  maxValue,
  minColor,
  maxColor,
  children
}: {
  value: number

  maxValue: number
  minColor: readonly [number, number, number]
  maxColor: readonly [number, number, number]
  children: any
}) {
  const range = Math.min(value / maxValue, 1)
  const color = minColor.map((min, i) =>
    Math.round(min + range * (maxColor[i] - min))
  )
  return (
    <div
      style={{
        background: `rgb(${color.join(',')})`,
        color: 'black'
      }}
      className="full-cell big-text-black"
    >
      {children}
    </div>
  )
}
