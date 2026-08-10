import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const SkyPass = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M4.5 21.5L10 27L2.38462 25.1013L0 16.5L4.5 21.5Z" />
    <path d="M7 33L4.07692 28L11.5 29L11 31.5L7 33Z" />
    <path d="M7 35L11 33.5L9.5 38L2.38462 42.5L7 35Z" />
    <path d="M43.5 22L38 27.5L45.6154 25.6013L48 17L43.5 22Z" />
    <path d="M41 33.5L43.9231 28.5L36.5 29.5L37 32L41 33.5Z" />
    <path d="M41 35.5L37 34L38.5 38.5L45.6154 43L41 35.5Z" />
    <path d="M45 14.9143L29.983 15.9143L23.9986 1L18.017 15.9143L3 14.9143L15.7984 28.9874L9.59908 46L23.9986 35.9243L38.4009 46L32.2016 28.9874L45 14.9143Z" />
  </IconSVG>
))

SkyPass.displayName = 'SkyPass'
