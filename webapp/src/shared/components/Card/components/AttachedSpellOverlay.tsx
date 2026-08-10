import clsx from 'clsx'
import { CSSProperties, Dispatch, memo, SetStateAction } from 'react'

import { CardType } from '~/shared/constants/cards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Portal } from '../../Portal'
import { OverlayCard } from '../shared/components/OverlayCard'
import {
  AttachedSpellCardStyle,
  AttachedSpellOverlayStyle
} from './AttachedSpellOverlay.css'
interface AttachedSpellOverlayProps {
  baseId: CardType['baseId']
  grade: CardType['grade']
  popperStyles?: CSSProperties
  popperAttrs?: { [key: string]: { [key: string]: string } | undefined }
  setAreaRef?: Dispatch<SetStateAction<HTMLDivElement | null>>
  setPoppperRef?: Dispatch<SetStateAction<HTMLDivElement | null>>
  shouldShow: boolean
  onClick: () => void
}

export const AttachedSpellOverlay = memo(
  ({
    baseId,
    grade,
    setAreaRef,
    popperAttrs,
    popperStyles,
    setPoppperRef,
    shouldShow,
    onClick
  }: AttachedSpellOverlayProps) => {
    if (!setAreaRef) return null

    return (
      <>
        <div
          className={AttachedSpellOverlayStyle}
          onClick={onClick}
          ref={setAreaRef}
        />
        <Portal>
          <div
            className={clsx(
              AttachedSpellCardStyle,
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

AttachedSpellOverlay.displayName = 'AttachedSpellOverlay'
