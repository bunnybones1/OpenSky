import styled from '@emotion/styled'

import { Box } from '~/shared/components/Base/Box'

interface Props {
  hasValue: boolean
  focused: boolean
  isErrored?: boolean
  isInvalid?: boolean
}

interface StyleProps {
  isErrored?: boolean
  isInvalid?: boolean
}

const getActiveLineColor = (props) => {
  if (props.isErrored) {
    return props.theme.colors.warm9
  }
  if (props.isInvalid) {
    return props.theme.colors.warm8
  }
  return props.theme.colors.purple9
}

const StyledActiveLine = styled(Box)<StyleProps>`
  transform: translateX(-50%);
  transform-origin: center;
  background-color: ${getActiveLineColor};
`

const ActiveLine = (props: Props) => {
  const { hasValue, focused } = props
  return (
    <StyledActiveLine
      width={hasValue || focused ? '100%' : 0}
      opacity={hasValue || focused ? 1 : 0}
      transitionTheme={true}
      isErrored={props.isErrored}
      isInvalid={props.isInvalid}
      position="absolute"
      bottom={['-1px', '-1px', '-1.5px', '-1.5px']}
      left="50%"
      height={['2px', '2px', '3px', '3px']}
    />
  )
}

export default ActiveLine
