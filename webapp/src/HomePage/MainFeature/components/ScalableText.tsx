import { memo } from 'react'

interface SVGTextProps {
  textToRender: string
}

export const TitleDescriptor = memo(({ textToRender }: SVGTextProps) => {
  return (
    <svg
      height="100%"
      viewBox="0 0 250 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x={0}
        y={13}
        fontFamily="Barlow"
        fill="#FFC051"
        fontWeight="500"
        textAnchor="start"
        fontSize="12px"
      >
        {textToRender}
      </text>
    </svg>
  )
})

TitleDescriptor.displayName = 'TitleDescriptor'

export const Title = memo(({ textToRender }: SVGTextProps) => {
  return (
    <svg
      height="100%"
      viewBox="0 0 800 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
    >
      <text
        x={0}
        y={41}
        fontFamily="Barlow Condensed"
        fill="#FFF"
        fontWeight="700"
        textAnchor="start"
        fontSize="inherit"
      >
        {textToRender}
      </text>
    </svg>
  )
})

Title.displayName = 'Title'

interface DescriptionProps {
  firstLineOfText: string
  secondLineOfText?: string
}

export const Description = memo(
  ({ firstLineOfText, secondLineOfText }: DescriptionProps) => {
    return (
      <svg
        height="100%"
        viewBox="0 0 800 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
      >
        <text
          x={0}
          y={18}
          fontFamily="Barlow"
          fill="#C5B4F5"
          fontWeight="400"
          textAnchor="start"
          fontSize="inherit"
        >
          <tspan>{firstLineOfText}</tspan>
          {!!secondLineOfText ? (
            <tspan dy="1.3em" x="0">
              {secondLineOfText}
            </tspan>
          ) : null}
        </text>
      </svg>
    )
  }
)

Description.displayName = 'Description'
