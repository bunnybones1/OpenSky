import { keyframes } from '@emotion/react'

export interface loopInterface {
  duration?: number
  repeat?: number
  repeatType?: 'mirror' | 'reverse' | 'loop'
  disabled?: boolean
  type?: string
  stiffness?: number
}
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const loop = ({
  duration = 1.5,
  repeat = Infinity,
  repeatType = 'mirror',
  disabled = false,
  type = 'spring',
  stiffness = 100
}: loopInterface) => {
  if (disabled) return {}
  return {
    transition: { duration, repeat, repeatType, type, stiffness }
  }
}

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const opacity = () => {
  return {
    animate: {
      opacity: [0.3, 1]
    }
  }
}

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const slideInFromTop = () => {
  return {
    animate: {
      transform: ['translateY(-100%)', 'translateY(0%)']
    }
  }
}

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const slideInFromLeft = () => {
  return {
    animate: {
      transform: ['translateX(-100%)', 'translateX(0%)']
    }
  }
}

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const cardGlow = () => {
  return {
    animate: {
      filter: ['hue-rotate(0deg) saturate(1)', 'hue-rotate(33deg) saturate(1.3)']
    }
  }
}

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const ZoomIn = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const ZoomOut = keyframes`
  0% {
    transform:scale(1);
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform:scale(0);
  }
`

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const FadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

/**
 * @deprecated Use vanilla-extract keyframes
 */
export const FadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const FadeOutIn = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const SlideIn = keyframes`
  0% {
    transform: scaleY(0);
    opacity: 0;
  }
  33% {
    transform: scaleY(0.5);
    opacity: 0.3;
  }
  66% {
    transform: scaleY(0.75);
    opacity: 1;
  }
  90% {
    transform: scaleY(1.2);
    opacity: 1;
  }
  100% {
    transform: scaleY(1);
    opacity: 1;
  }
`
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const SlideOut = keyframes`
  from {
    transform: translateY(0px);
    opacity: 1;
  }
  to {
    transform: translateY(-12px);
    opacity: 0;
  }
`
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const FlashOut = keyframes`
  from {
    filter: contrast(100%) brightness(100%);
    opacity: 1;
  }
  to {
    filter: contrast(90%) brightness(600%);
    opacity: 0;
  }
`
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const FlashIn = keyframes`
  from {
    filter: contrast(90%) brightness(600%);
    opacity: 0;
  }
  to {
    filter: contrast(100%) brightness(100%);
    opacity: 1;
  }
`
/**
 * @deprecated Use vanilla-extract keyframes
 */
export const JustFlash = keyframes`
  0% {
    filter: contrast(100%) brightness(100%);
  }
  40% {
    filter: contrast(90%) brightness(400%);
  }
  100% {
    filter: contrast(100%) brightness(100%);
  }
`
