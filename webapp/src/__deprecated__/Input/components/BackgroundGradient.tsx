import styled from '@emotion/styled'

import { Box } from '~/shared/components/Base/Box'

interface Props {
  isInvalid?: boolean
  isErrored?: boolean
  focused: boolean
}

const getWrapperGradient = (props) => {
  if (props.isErrored) {
    return 'linear-gradient(to top, rgba(171, 91, 91, 0.35), rgba(171, 91, 91, 0))'
  }
  if (props.isInvalid) {
    return 'linear-gradient(to top, rgba(255, 150, 7, 0.2), rgba(255, 150, 7, 0))'
  }
  return 'linear-gradient(to top, rgba(112, 91, 171, 0.35), rgba(112, 91, 171, 0))'
}

const StyledBackgroundGradient = styled(Box)<{
  isErrored?: boolean
  isInvalid?: boolean
}>`
  transition: ${(props) => props.theme.transition};
  background-image: ${getWrapperGradient};
  pointer-events: none;
`

const BackgroundGradient = (props: Props) => {
  return (
    <StyledBackgroundGradient
      width="100%"
      height="100%"
      transitionTheme={true}
      opacity={props.focused ? 1 : 0}
      position="absolute"
      left={0}
      top={0}
      isErrored={props.isErrored}
      isInvalid={props.isInvalid}
    />
  )
}

export default BackgroundGradient
