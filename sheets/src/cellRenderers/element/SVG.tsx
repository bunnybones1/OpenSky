import { ReactNode } from 'react'

export interface SVGProps {
  height: number
  children?: ReactNode
  boxHeight: number
  boxWidth: number
  className?: string
}

export interface HeightOnly {
  height: number
}

export function SVG({ height, children, boxHeight, boxWidth, className }: SVGProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      aria-hidden={true}
      height={height}
      className={className}
    >
      {children}
    </svg>
  )
}
