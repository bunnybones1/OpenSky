import clsx from 'clsx'
import { CSSProperties, Dispatch, memo, SetStateAction } from 'react'

import { CardType } from '~/shared/constants/cards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Portal } from '../../Portal'
import { OverlayCard } from '../shared/components/OverlayCard'
import {
  MentionedCardOverlayStyle,
  MentionedCardStyle
} from './MentionedCardOverlay.css'

interface MentionedCardOverlayProps {
  baseId: CardType['baseId']
  grade: CardType['grade']
  popperStyles?: CSSProperties
  popperAttrs?: { [key: string]: { [key: string]: string } | undefined }
  setAreaRef?: Dispatch<SetStateAction<HTMLDivElement | null>>
  setPoppperRef?: Dispatch<SetStateAction<HTMLDivElement | null>>
  shouldShow: boolean
  onClick: () => void
}

export const MentionedCardOverlay = memo(
  ({
    baseId,
    onClick,
    grade,
    setAreaRef,
    popperStyles,
    popperAttrs,
    setPoppperRef,
    shouldShow
  }: MentionedCardOverlayProps) => {
    if (!setAreaRef) return null

    return (
      <>
        <div
          className={MentionedCardOverlayStyle}
          ref={setAreaRef}
          onClick={onClick}
        />
        <Portal>
          <div
            className={clsx(
              MentionedCardStyle,
              Sprinkles({ pointerEvents: 'none' }),
              { shouldShow }
            )}
            style={popperStyles}
            {...popperAttrs}
            ref={setPoppperRef}
          >
            {!!shouldShow && <OverlayCard baseId={baseId} grade={grade} />}
          </div>
        </Portal>
      </>
    )
  }
)

MentionedCardOverlay.displayName = 'AttachedSpellOverlay'
