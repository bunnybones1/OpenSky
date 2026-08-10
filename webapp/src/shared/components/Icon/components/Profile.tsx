import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Profile = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M36.7685 13.8079C36.7685 20.9015 31.0149 26.6553 23.9212 26.6553C16.8276 26.6553 11.0739 20.8622 11.0739 13.8079C11.0739 6.75374 16.8277 1 23.9212 1C31.0148 1 36.7685 6.71438 36.7685 13.8079Z" />
    <path d="M46.3055 46.7144H1.69457C0.748758 46.7144 0 45.9656 0 45.0198C0 36.1134 7.25126 28.9015 16.1183 28.9015H31.8818C40.7883 28.9015 48 36.1528 48 45.0198C48 45.9656 47.2512 46.7144 46.3055 46.7144Z" />
  </IconSVG>
))

Profile.displayName = 'Profile'
