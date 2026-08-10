import { memo } from 'react'

interface Props {
  width?: number
  height?: number
}

export const SelectBarStructure = memo((props: Props) => {
  const width = props.width || 300
  const height = props.height || 45
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      width={width}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs>
        <linearGradient
          x1="100%"
          y1="22.8808594%"
          x2="45.0335563%"
          y2="22.8808594%"
          id="selectBarGradient1"
        >
          <stop stopColor="#4D3C7B" stopOpacity="0" offset="0%" />
          <stop stopColor="#4D3C7B" offset="100%" />
        </linearGradient>
        <linearGradient
          x1="50%"
          y1="100%"
          x2="50%"
          y2="40.3819444%"
          id="selectBarGradient2"
        >
          <stop stopColor="#4D3C7B" stopOpacity="0" offset="0%" />
          <stop stopColor="#4D3C7B" offset="100%" />
        </linearGradient>
      </defs>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <rect fill="#4D3C7B" x={width - 180} y="0" width={60} height="1" />
        <g fillRule="nonzero">
          <polygon
            fill="url(#selectBarGradient1)"
            opacity="0.5"
            points={`${height - 17} 18 ${height + 75} 18 ${height + 75} 17 ${
              height - 17
            } 17`}
          />
          {/* eslint-disable max-len */}
          <path
            d={`M${height}.3688632,1 L${width - 180},1 L${
              width - 180
            },-3.55271368e-15 L${height}.1616032,-3.55271368e-15 C${height}.0289042,-3.55271368e-15 ${
              height - 1
            }.901648,0.0527502806 ${
              height - 1
            }.8078648,0.146631673 L-3.00559577e-12,${height} L1.41729736,${height} L${height}.3688632,1 Z`}
            fill="url(#selectBarGradient2)"
          />
        </g>
        <g
          transform={`translate(${
            width - 60
          }.000000, 22.500000) scale(-1, 1) translate(-${
            width - 60
          }.000000, -22.500000) translate(${width - 120}.000000, 0.000000)`}
          fillRule="nonzero"
        >
          <polygon
            fill="url(#selectBarGradient1)"
            opacity="0.5"
            points={`${height - 17} 18 ${height + 75} 18 ${height + 75} 17 ${
              height - 17
            } 17`}
          />
          <path
            d={`M${height}.3688632,1 L120,1 L120,-3.55271368e-15 L${height}.1616032,-3.55271368e-15 C${height}.0289042,-3.55271368e-15 ${
              height - 1
            }.901648,0.0527502806 ${
              height - 1
            }.8078648,0.146631673 L-3.00559577e-12,${height} L1.41729736,${height} L${height}.3688632,1 Z`}
            fill="url(#selectBarGradient2)"
          />
          {/* eslint-enable max-len */}
        </g>
      </g>
    </svg>
  )
})

SelectBarStructure.displayName = 'SelectBarStructure'
