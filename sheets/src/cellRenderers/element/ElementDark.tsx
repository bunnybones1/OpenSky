import { SVG, SVGProps } from './SVG'

export function ElementDark({ height }: SVGProps) {
  return (
    <SVG boxWidth={48} boxHeight={48} height={height}>
      <path
        fill="rgb(109, 58, 112)"
        d="M24,6h0A18,18,0,1,0,42,24,18,18,0,0,0,24,6ZM11.4,24A12.58,12.58,0,0,1,30.48,13.21H30.3a10.8,10.8,0,0,0,0,21.6h.18A12.58,12.58,0,0,1,11.4,24Z"
      />
    </SVG>
  )
}
