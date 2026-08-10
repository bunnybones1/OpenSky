import { AnimatePresence } from 'framer-motion'
import { memo, useLayoutEffect, useRef, useState } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchMakerColorType } from '../shared/type'
import { MatchMakerWidgetLogo0 } from './components/MatchMakerWidgetLogo0'
import { MatchMakerWidgetLogo1 } from './components/MatchMakerWidgetLogo1'
import { MatchMakerWidgetLogo2 } from './components/MatchMakerWidgetLogo2'
import { MatchMakerWidgetLogo3 } from './components/MatchMakerWidgetLogo3'
import { MatchMakerWidgetLogo4 } from './components/MatchMakerWidgetLogo4'
import { MatchMakerWidgetLogo5 } from './components/MatchMakerWidgetLogo5'
import { MatchMakerWidgetLogo6 } from './components/MatchMakerWidgetLogo6'

interface MatchMakerWidgetLogoProps {
  color: MatchMakerColorType
}

export const MatchMakerWidgetLogo = memo(({ color }: MatchMakerWidgetLogoProps) => {
  const intervalRef = useRef<number | null>(null)
  const [logoStep, setLogoStep] = useState(1)

  useLayoutEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setLogoStep((step) => {
        if (step === 6) return 1
        return step + 1
      })
    }, 301)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div
      className={Sprinkles({ width: 'full', position: 'relative', height: 'full' })}
    >
      <AnimatePresence>
        {logoStep === 1 && <MatchMakerWidgetLogo1 color={color} key="1" />}
        {logoStep === 2 && <MatchMakerWidgetLogo2 color={color} key="2" />}
        {logoStep === 3 && <MatchMakerWidgetLogo3 color={color} key="3" />}
        {logoStep === 4 && <MatchMakerWidgetLogo4 color={color} key="4" />}
        {logoStep === 5 && <MatchMakerWidgetLogo5 color={color} key="5" />}
        {logoStep === 6 && <MatchMakerWidgetLogo6 color={color} key="6" />}
        <MatchMakerWidgetLogo0 color={color} key="0" />
      </AnimatePresence>
    </div>
  )
})

MatchMakerWidgetLogo.displayName = 'MatchMakerWidgetLogo'
