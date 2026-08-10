import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const CardBackSolid = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={32} boxHeight={32} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 8.41117L16 0.822571L26 8.41117V23.6028L16 31.1753L6 23.6028V8.41117Z"
      fill="black"
    />
    <path
      d="M9.66699 10.3333L16.0003 5.66663L22.667 10.3333V22L16.0003 26.6666L9.66699 22V10.3333Z"
      fill="#5787A8"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.1728 8.91385C15.561 8.59629 16.109 8.58342 16.5111 8.88241L19.5456 11.1388C19.8311 11.3511 20 11.6903 20 12.0512V19.9487C20 20.3096 19.8311 20.6488 19.5456 20.8611L16.5111 23.1175C16.1053 23.4192 15.5516 23.4031 15.1633 23.0783L12.3649 20.7373C12.2337 20.6275 12.2143 20.433 12.3212 20.2995C12.9825 19.4731 14.194 19.352 15.0058 20.0311L15.9017 20.7806L17.7931 19.3742V12.6258L15.894 11.2136L14.2069 12.5935V15.4909L15.8078 16.9232C15.9352 17.0371 15.9482 17.2319 15.8371 17.3617C15.1494 18.1653 13.9354 18.2462 13.1471 17.541L12.3768 16.8519C12.1374 16.6377 12 16.3282 12 16.0029V12.0512C12 11.7085 12.1524 11.3844 12.4141 11.1703L15.1728 8.91385Z"
      fill="#F1F1F4"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.1333 10.5191V21.4924L16 25.9349L21.8667 21.4924V10.5191L16 6.0671L10.1333 10.5191ZM16 3.33331L8 9.40419V22.6087L16 28.6666L24 22.6087V9.40419L16 3.33331Z"
      fill="#F1F1F4"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 28.6666L24 22.6087V9.40419L16 3.33331V6.0671L21.8667 10.5191V21.4924L16 25.9349V28.6666Z"
      fill="#76A7D2"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.8569 21.4998L21.8667 21.4924V10.5191L21.8379 10.4973L23.8497 9.29016L24 9.4042V22.6087L23.8946 22.6885L21.8569 21.4998Z"
      fill="#2B6085"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 25.9349V28.6666L23.9564 22.6417L21.8667 21.4476V21.4924L16 25.9349Z"
      fill="#1F3650"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.1336 21.4476V21.4924L16.0003 25.9349V28.6666L8.04395 22.6417L10.1336 21.4476Z"
      fill="#4B7797"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.1338 10.5524V10.5191L16.0004 6.0671V3.33331L8.05371 9.36376L10.1338 10.5524Z"
      fill="white"
    />
  </ImageIconSVG>
))

CardBackSolid.displayName = 'CardBackSolid'
