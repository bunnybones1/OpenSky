import styled from '@emotion/styled'
import clsx from 'clsx'
import { createRef, PureComponent } from 'react'
import * as React from 'react'

import Glow from '~/shared/components/Glow'
import { Portal } from '~/shared/components/Portal'

// TODO: Definite refactor needed here.

interface Props {
  direction?: 'top' | 'left' | 'right' | 'bottom'
  tooltip?: React.ReactNode
  className?: string
  containerClassName?: string
  useParentDimensions?: boolean
  active?: boolean
  clickToOpen?: boolean
  isMobile?: boolean
  onClose?(): void
  yOffset?: number
  xOffset?: number
  delay?: number
  children: React.ReactNode
}

/**
 * @deprecated Use ~/shared/components/Tooltip
 */
class ToolTipWrapper extends PureComponent<Props> {
  private toolTipContainerRef = createRef<HTMLDivElement>()
  private containerRef = createRef<HTMLDivElement>()

  componentDidMount() {
    if (this.props.active) {
      setTimeout(() => {
        this.openToolTip()
      }, 125)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { active } = this.props

    if (active !== prevProps.active) {
      if (active) {
        this.openToolTip()

        return
      }

      if (this.toolTipContainerRef.current) {
        this.toolTipContainerRef.current.style.visibility = 'hidden'
      }
    }
  }

  render() {
    const {
      children,
      tooltip,
      className,
      containerClassName,
      useParentDimensions,
      clickToOpen
    } = this.props

    return (
      <>
        <Container
          className={clsx(containerClassName, {
            useParentDimensions
          })}
          ref={this.containerRef}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
          onTouchStart={this.handleTouchStart}
          onTouchEnd={this.handleTouchEnd}
        >
          {children}
        </Container>

        {tooltip && (
          <Portal>
            <ToolTipContainer
              className={clsx(className, 'toolTipContainer')}
              ref={this.toolTipContainerRef}
              clickToOpen={clickToOpen}
            >
              <Glow duration={2.2} />
              {tooltip}
            </ToolTipContainer>
          </Portal>
        )}
      </>
    )
  }

  private openToolTip = () => {
    if (this.containerRef.current) {
      this.openToolTipOnEl(this.containerRef.current!)
    }
  }

  private openToolTipOnEl = (containerEl: HTMLDivElement) => {
    const clientRect = containerEl.getBoundingClientRect()

    if (this.toolTipContainerRef.current) {
      const { direction = 'top', yOffset = 0, xOffset = 0 } = this.props

      const { height: toolTipHeight, width: toolTipWidth } =
        this.toolTipContainerRef.current.getBoundingClientRect()

      this.toolTipContainerRef.current.style.visibility = 'visible'

      if (direction === 'top') {
        this.toolTipContainerRef.current.style.top = `${
          clientRect.top - toolTipHeight - 12 + yOffset
        }px`
        this.toolTipContainerRef.current.style.left = `${
          clientRect.left + xOffset - toolTipWidth / 2
        }px`
      }

      if (direction === 'left') {
        this.toolTipContainerRef.current.style.top = `${
          clientRect.top + toolTipHeight / 2 + yOffset
        }px`
        this.toolTipContainerRef.current.style.left = `${
          clientRect.left + xOffset - toolTipWidth - 12
        }px`
      }

      if (direction === 'right') {
        this.toolTipContainerRef.current.style.top = `${
          clientRect.top + toolTipHeight / 2 + yOffset
        }px`
        this.toolTipContainerRef.current.style.left = `${
          clientRect.right + xOffset + 12
        }px`
      }

      if (direction === 'bottom') {
        this.toolTipContainerRef.current.style.top = `${
          clientRect.height + toolTipHeight - 12 + yOffset
        }px`
        this.toolTipContainerRef.current.style.left = `${clientRect.left + xOffset}px`
      }
    }
  }

  private handleMouseEnter = () => {
    if (!this.props.isMobile) {
      this.openToolTip()
    }
  }

  private handleMouseLeave = () => {
    if (!this.props.isMobile && this.toolTipContainerRef.current) {
      this.toolTipContainerRef.current.style.visibility = 'hidden'

      if (this.props.onClose) {
        this.props.onClose()
      }
    }
  }

  private handleTouchStart = () => {
    if (this.props.clickToOpen) {
      this.openToolTip()
    }
  }

  private handleTouchEnd = () => {
    if (this.toolTipContainerRef.current) {
      this.toolTipContainerRef.current.style.visibility = 'hidden'
      if (this.props.onClose) {
        this.props.onClose()
      }
    }
  }
}

const ToolTipContainer = styled.div<{ clickToOpen?: boolean }>`
  position: fixed;
  z-index: 999;
  padding: 6px 10px;
  background-color: ${({ theme }) => theme.colors.black};
  pointer-events: none;
  color: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.purple6};
  font-size: 12px;
  text-align: center;
  visibility: hidden;
  ${(props) => props.theme.mediaQueries.tablet && !props.clickToOpen} {
    visibility: hidden !important;
  }
`

const Container = styled.div`
  &.useParentDimensions {
    width: 100%;
    height: 100%;
  }

  width: auto;
  height: auto;
  :hover {
    ${ToolTipContainer} {
      visibility: visible;
    }
  }
`

export default ToolTipWrapper
