import clsx from 'clsx'
import { memo, useEffect, useRef } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GradeBarStyle } from './GradeBar.css'

const base = '#5E3EB9'
const gold = '#DEBA3A'
const silver = '#8DA7B3'
const BASE_WIDTH = 190.1184

interface GradeBarProps {
  numCardsRequiredInDeck: number
  numGoldCards: number
  numSilverCards: number
  isLarge: boolean
}

export const GradeBar = memo(
  ({
    isLarge,
    numGoldCards,
    numSilverCards,
    numCardsRequiredInDeck
  }: GradeBarProps) => {
    const leftCornerRef = useRef<SVGPathElement | null>(null)
    const rightCornerRef = useRef<SVGPathElement | null>(null)
    const goldBarRef = useRef<SVGRectElement | null>(null)
    const silverBarRef = useRef<SVGRectElement | null>(null)

    useEffect(() => {
      if (
        !!goldBarRef.current &&
        !!leftCornerRef.current &&
        !!rightCornerRef.current &&
        !!silverBarRef.current
      ) {
        let leftCornerColor = base
        let rightCornerColor = base

        // Color the begining and end of the bar depending on which
        // segment will be touching it.
        if (!numGoldCards && !!numSilverCards) {
          leftCornerColor = silver
        } else if (!!numGoldCards) {
          leftCornerColor = gold
        }

        if (numGoldCards === numCardsRequiredInDeck) {
          rightCornerColor = gold
        } else if (
          numSilverCards === numCardsRequiredInDeck ||
          numGoldCards + numSilverCards === numCardsRequiredInDeck
        ) {
          rightCornerColor = silver
        }

        rightCornerRef.current.style.fill = rightCornerColor
        leftCornerRef.current.style.fill = leftCornerColor

        // Hide the silver or gold bars if there are no silver or gold cards
        if (!numSilverCards) {
          silverBarRef.current.style.fillOpacity = '0'
        } else {
          silverBarRef.current.style.fillOpacity = '1'
        }

        if (!numGoldCards) {
          goldBarRef.current.style.fillOpacity = '0'
        } else {
          goldBarRef.current.style.fillOpacity = '1'
        }

        let goldWidth = 0

        if (!!numGoldCards) {
          const goldRatio = numGoldCards / numCardsRequiredInDeck
          goldWidth = BASE_WIDTH * goldRatio
          goldBarRef.current.style.width = `${
            goldWidth > BASE_WIDTH ? BASE_WIDTH : goldWidth
          }`
        }

        if (!!numSilverCards) {
          const silverRatio = numSilverCards / numCardsRequiredInDeck
          const silverWidth = goldWidth + BASE_WIDTH * silverRatio
          silverBarRef.current.style.width = `${
            silverWidth > BASE_WIDTH ? BASE_WIDTH : silverWidth
          }`
        }
      }
    }, [numGoldCards, numSilverCards, numCardsRequiredInDeck])

    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start'
          }),
          GradeBarStyle,
          { isLarge }
        )}
      >
        <svg
          width={isLarge ? '221' : '154'}
          height={isLarge ? '16' : '11'}
          viewBox="0 0 221 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.0292969 4.45117H209.004L220.109 15.8839H0.0292969V4.45117Z"
            fill="black"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.0292969 7.30946H207.666L215.822 15.884H217.966L208.258 5.88037H0.0292969V7.30946Z"
            fill="#40306B"
          />
          {/* Main Bar */}
          <rect
            x="15.7"
            y="10.1675"
            width={`${BASE_WIDTH}`}
            height="2.85"
            fill="#5E3EB9"
          />
          {/* Second Bar */}
          <rect
            x="15.7"
            y="10.1675"
            width="150.055"
            style={{ transition: '0.2s ease-in' }}
            height="2.85"
            ref={silverBarRef}
            fill="#8DA7B3"
          />
          {/* First Bar */}
          <rect
            x="15.7"
            y="10.168"
            width="54.3055"
            height="2.85"
            fill="#DEBA3A"
            ref={goldBarRef}
            style={{ transition: '0.2s ease-in' }}
          />
          <path
            d="M0.0292969 15.8842L0.0292969 1.59326L14.3202 15.8842L0.0292969 15.8842Z"
            fill="#40306B"
          />
          <path
            d="M0.0292969 15.8842L0.0292969 8.73877L7.17475 15.8842H0.0292969Z"
            fill="#231445"
          />
          <path
            d="M0.0292969 3.7369V1.59326L14.3202 15.8842H12.1766L0.0292969 3.7369Z"
            fill="#705BAB"
          />
          {/* Right Corner */}
          <path
            d="M205.818 13.0257V10.1675L208.677 13.0257H205.818Z"
            fill="#5E3EB9"
            ref={rightCornerRef}
          />
          {/* Left Corner */}
          <path
            d="M15.749 10.1677L15.749 13.0259L12.8908 10.1677L15.749 10.1677Z"
            fill="#DEBA3A"
            ref={leftCornerRef}
          />
        </svg>
      </div>
    )
  }
)

GradeBar.displayName = 'GradeBar'
