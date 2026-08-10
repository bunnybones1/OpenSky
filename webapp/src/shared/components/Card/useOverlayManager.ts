import { isMobileBrowser } from '@opensky/shared/native'
import { Options } from '@popperjs/core'
import { produce } from 'immer'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePopper } from 'react-popper'

import { CARD_RATIO } from '~/shared/constants/ui'
import { getTooltipPaddingMod } from '~/shared/helpers/get-tooltip-padding-mod'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'

const PopperOptions: Partial<Options> = {
  strategy: 'absolute',
  placement: 'left-start',
  modifiers: [
    {
      name: 'offset',
      options: {
        offset: [20, 8]
      }
    }
  ]
}

const CardPopperOptions: Partial<Options> = {
  strategy: 'absolute',
  placement: 'right-start',
  modifiers: [
    {
      name: 'sameWidth',
      enabled: true,
      fn: ({ state }) => {
        const cardWidth = state.rects.reference.width * 0.7

        const cardHeight = cardWidth * CARD_RATIO

        state.styles.popper.width = `${cardWidth}px`
        state.styles.popper.height = `${cardHeight}px`
      },
      phase: 'beforeWrite',
      requires: ['computeStyles']
    },
    {
      name: 'offset',
      options: {
        offset: [0, 8]
      }
    }
  ]
}

export interface UseOverlayManagerParams {
  showDelay?: number
  overlayPadding?: { top: number; bottom: number; left: number; right: number }
  hasAttachedSpell: boolean
  hasMentioned: boolean
  hasKeywords: boolean
  onHover?: () => void
}

type OverlayKeys = 'spell' | 'keywords' | 'mentioned'

export const useOverlayManager = ({
  showDelay,
  overlayPadding,
  hasAttachedSpell,
  hasMentioned,
  hasKeywords,
  onHover
}: UseOverlayManagerParams) => {
  // Keywords Overlay Value
  const [keywordsAreaRef, setKeywordsAreaRef] = useState<HTMLDivElement | null>(null)
  const [keywordsPopperRef, setKeywordsPopperRef] = useState<HTMLDivElement | null>(
    null
  )
  const [showKeywords, setShowKeywords] = useState(false)
  const keywordsSetShowTimeOut = useRef<number | null>(null)

  // Attached Spell Overlay Values
  const [spellAreaRef, setSpellAreaRef] = useState<HTMLDivElement | null>(null)
  const [showSpell, setShowSpell] = useState(false)
  const spellSetShowTimeOut = useRef<number | null>(null)

  // Mentioned Card Overlay Values
  const [mentionedAreaRef, setMentionedAreaRef] = useState<HTMLDivElement | null>(
    null
  )
  const [showMentioned, setShowMentioned] = useState(false)
  const mentionedSetShowTimeOut = useRef<number | null>(null)

  // Shared card popper ref since they dont show at the same time / use the same positioning
  const [cardPopperRef, setCardPopperRef] = useState<HTMLDivElement | null>(null)

  const getInfo = useCallback(
    (key: OverlayKeys) => {
      switch (key) {
        case 'mentioned':
          return {
            areaRef: mentionedAreaRef,
            timeoutRef: mentionedSetShowTimeOut,
            shower: setShowMentioned
          }
        case 'spell':
          return {
            areaRef: spellAreaRef,
            timeoutRef: spellSetShowTimeOut,
            shower: setShowSpell
          }
        default:
          return {
            areaRef: keywordsAreaRef,
            timeoutRef: keywordsSetShowTimeOut,
            shower: setShowKeywords
          }
      }
    },
    [keywordsAreaRef, mentionedAreaRef, spellAreaRef]
  )

  const optionsWithPadding = useCallback(
    (options: Partial<Options>) => {
      const flipMod = getTooltipPaddingMod(
        overlayPadding || { top: 0, bottom: 0, left: 0, right: 0 }
      )
      return produce(options, (draft) => {
        draft.modifiers = draft.modifiers ? [...draft.modifiers, flipMod] : [flipMod]
      })
    },
    [overlayPadding]
  )

  const { styles: keywordsStyles, attributes: keywordsAttrs } = usePopper(
    !!hasKeywords ? keywordsAreaRef : null,
    !!hasKeywords ? keywordsPopperRef : null,
    {
      ...optionsWithPadding(PopperOptions),
      placement: 'left-start',
      strategy: 'fixed'
    }
  )

  // The attached spell and mentioned card shared the same styling
  const {
    styles: cardStyles,
    attributes: cardAttrs,
    update
  } = usePopper(
    !!hasAttachedSpell || !!hasMentioned ? keywordsAreaRef : null,
    !!hasAttachedSpell || !!hasMentioned ? cardPopperRef : null,
    {
      ...optionsWithPadding(CardPopperOptions),
      placement: 'right-start',
      strategy: 'fixed'
    }
  )

  const delayedSetShow = useCallback(
    (delay: number = 350, key: OverlayKeys) => {
      if (onHover) {
        onHover()
      }

      const { timeoutRef, shower } = getInfo(key)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)

      timeoutRef.current = window.setTimeout(() => {
        shower(true)
        if (!!update && (key === 'spell' || key === 'mentioned')) {
          update()
        }
      }, delay)
    },
    [getInfo, onHover, update]
  )

  const showPopper = useCallback(
    (key: OverlayKeys) => () => {
      const { shower } = getInfo(key)
      shower(true)
    },
    [getInfo]
  )

  const hidePopper = useCallback(
    (key: OverlayKeys) => () => {
      const { shower, timeoutRef } = getInfo(key)

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      shower(false)
    },
    [getInfo]
  )

  const attachListeners = useCallback(() => {
    const keys: OverlayKeys[] = [
      'keywords' as const,
      !!hasAttachedSpell ? ('spell' as const) : undefined,
      !!hasMentioned ? ('mentioned' as const) : undefined
    ].filter(isDefined)

    keys.forEach((key) => {
      const { areaRef } = getInfo(key)
      if (!!areaRef) {
        if (isMobileBrowser()) {
          areaRef.oncontextmenu = (e) => e.preventDefault()
          areaRef.ontouchstart = () => delayedSetShow(showDelay, key)
          areaRef.ontouchend = hidePopper(key)
          areaRef.ontouchcancel = hidePopper(key)
          areaRef.ontouchmove = () => delayedSetShow(showDelay, key)
        } else {
          areaRef.onmouseenter = !!showDelay
            ? () => delayedSetShow(showDelay, key)
            : showPopper(key)
          areaRef.onmouseover = !!showDelay
            ? () => delayedSetShow(showDelay, key)
            : showPopper(key)
          areaRef.onmouseleave = hidePopper(key)
        }
      }
    })
  }, [
    hasAttachedSpell,
    hasMentioned,
    getInfo,
    hidePopper,
    delayedSetShow,
    showDelay,
    showPopper
  ])

  useEffect(() => {
    if (!!keywordsAreaRef) {
      attachListeners()
    }
  }, [attachListeners, keywordsAreaRef])

  return {
    setKeywordsAreaRef,
    setKeywordsPopperRef,
    showKeywords,
    keywordsAttrs,
    keywordsStyles: keywordsStyles.popper,
    setMentionedAreaRef,
    showMentioned,
    setSpellAreaRef,
    showSpell,
    cardAttrs,
    cardStyles: cardStyles.popper,
    setCardPopperRef
  }
}
