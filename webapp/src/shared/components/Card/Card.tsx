/* eslint-disable valtio/state-snapshot-rule */
import {
  CardDescriptionToken,
  getParsedCardDescription,
  joinParsedDescription
} from '@opensky/parse-card-description'
import { ItemType } from '@opensky/proto'
import { BaseCard, getTooltipsForCards } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { ComponentType, memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SoundClient } from '~/shared/clients'
import { CARD_BASE_CLASSNAME, Cards, CardType } from '~/shared/constants/cards'
import { useCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { TooltipPadding } from '~/shared/types/tooltip'

import { CardImage } from '../CardImage/CardImage'
import { isImageIcon } from '../ImageIcon/ImageIconConfig'
import { openItemCraftingDialog } from '../ItemCraftingDialog/shared/item-crafting-state'
import { ItemLock } from '../ItemLock'
import { Portal } from '../Portal'
import { TiltWrapper } from '../TiltWrapper'
import {
  CardLockStyle,
  CardOuterStyle,
  CardWrapperStyle,
  KeywordsOuterStyle,
  KeywordsWrapperStyle
} from './Card.css'
import { CardInfoBox } from './CardInfoBox/CardInfoBox'
import { AttachedSpellOverlay } from './components/AttachedSpellOverlay'
import { CraftableOverlay } from './components/CraftableOverlay'
import { MentionedCardOverlay } from './components/MentionedCardOverlay'
import { useOverlayManager } from './useOverlayManager'

const getMentionedCard = (
  description?: CardDescriptionToken[],
  baseId?: BaseCard
) => {
  if (!description || !baseId) {
    return
  }

  const mentionedCardToken = description.find(({ type, value }) => {
    if (type !== 'card' || !value.cardId) {
      return false
    }

    return Number(value.cardId) !== Number(baseId)
  })

  if (!!mentionedCardToken?.value && 'cardId' in mentionedCardToken.value) {
    return mentionedCardToken.value.cardId as BaseCard
  }

  return
}

interface CardProps {
  id: CardType['id']
  isOverlayEnabled?: boolean
  isTiltable?: boolean
  className?: string
  BalanceAndPriceInfo?: ComponentType<{ id: number }>
  SelectedFrame?: ComponentType<{ id: number }>
  onClick?: (card: CardType) => void
  onHover?: () => void
  isLocked?: boolean
  showLoadingFrame?: boolean
  overlayPadding?: TooltipPadding
  NewBadge?: ComponentType<{ id: number }>
  // Not used currently, but added for when crafting is working
  isCraftable?: boolean
}

export const Card = memo(
  ({
    id,
    BalanceAndPriceInfo,
    isTiltable,
    onClick,
    isOverlayEnabled,
    isLocked,
    className,
    showLoadingFrame,
    overlayPadding,
    NewBadge,
    onHover,
    isCraftable
  }: CardProps) => {
    const card = useMemo(() => Cards.get(id), [id])

    const cardTexts = useCardTexts(card?.baseId)

    const { t } = useTranslation()

    const onCardClick = useCallback(() => {
      if (isCraftable && !!card && card?.grade === ItemType.SW_BASE_CARDS) {
        openItemCraftingDialog({ id: card.id, itemType: ItemType.SW_BASE_CARDS })
      } else if (onClick && card) {
        onClick(card)
      }
    }, [card, isCraftable, onClick])

    const cardKeywords = useMemo(() => {
      if (card) {
        const keywords = getTooltipsForCards([{ base: card.baseId }])
        const parsedKeywords = keywords.map((tooltip) => ({
          icon:
            tooltip.vocab.icon && isImageIcon(tooltip.vocab.icon)
              ? tooltip.vocab.icon
              : undefined,
          description: joinParsedDescription(
            getParsedCardDescription(
              t(`vocab:${tooltip.vocabID as 'draw'}.text`) ?? '',
              () => {
                throw new Error('card IDs not supported in vocab')
              },
              t
            )
          ),
          name: joinParsedDescription(
            getParsedCardDescription(
              t(`vocab:${tooltip.vocabID as 'draw'}.title`) ?? '',
              () => {
                throw new Error('card IDs not supported in vocab')
              },
              t
            )
          )
        }))

        return parsedKeywords
      }
      return
    }, [card, t])

    const mentionedCardBaseId = useMemo(() => {
      return getMentionedCard(cardTexts?.description, card?.baseId)
    }, [card?.baseId, cardTexts?.description])

    const hasKeywords = !!isOverlayEnabled && !!cardKeywords && !!cardKeywords.length

    const hasAttachedSpell = !!isOverlayEnabled && !!card?.attachment

    const hasMentioned = !!isOverlayEnabled && !!mentionedCardBaseId

    const {
      keywordsAttrs,
      keywordsStyles,
      setKeywordsAreaRef,
      showKeywords,
      setKeywordsPopperRef,
      cardAttrs,
      cardStyles,
      setSpellAreaRef,
      setMentionedAreaRef,
      showMentioned,
      showSpell,
      setCardPopperRef
    } = useOverlayManager({
      showDelay: 350,
      overlayPadding,
      hasKeywords,
      hasAttachedSpell,
      hasMentioned,
      onHover
    })

    const hasOverlay = hasKeywords || hasAttachedSpell || hasMentioned

    const CardKeywordsComponent = useMemo(() => {
      if ((!cardKeywords || !cardKeywords.length) && !isLocked) return null
      return (
        <>
          <div className={KeywordsWrapperStyle}>
            {!!cardKeywords &&
              !!cardKeywords.length &&
              cardKeywords.map((keyword) => (
                <div
                  key={keyword.name}
                  className={Sprinkles({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  })}
                >
                  <CardInfoBox
                    icon={keyword.icon}
                    name={keyword.name}
                    description={keyword.description}
                  />
                </div>
              ))}
            {isLocked && (
              <div
                className={Sprinkles({
                  width: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                })}
              >
                <CardInfoBox description={t('cards.LockedDesc')} name="Locked" />
              </div>
            )}
          </div>
        </>
      )
    }, [cardKeywords, isLocked, t])

    if (!card) return null

    return (
      <div
        className={clsx(
          Sprinkles({ cursor: !!onClick ? 'pointer' : undefined }),
          CardOuterStyle,
          CARD_BASE_CLASSNAME,
          className
        )}
        ref={hasOverlay ? setKeywordsAreaRef : undefined}
        onMouseEnter={() => {
          if (isTiltable && !isLocked) SoundClient.playSound('CursorMainHover')
          if (!hasOverlay && onHover) onHover()
        }}
        onMouseDown={() => SoundClient.playSound('CursorMainClick')}
        data-card-id={id}
        data-card-base-id={card.baseId}
      >
        <div className={clsx(CardWrapperStyle, { isLocked })}>
          <div
            className={Sprinkles({
              height: 'full',
              width: 'full',
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start'
            })}
          >
            <TiltWrapper isEnabled={!!isTiltable && !isCraftable}>
              <CardImage
                onClick={onCardClick}
                id={id}
                showLoadingFrame={showLoadingFrame}
              />
            </TiltWrapper>
          </div>
          <CraftableOverlay isCraftable={!!isCraftable} />
        </div>
        {!!BalanceAndPriceInfo && <BalanceAndPriceInfo id={id} />}

        {hasKeywords && !!showKeywords && (
          <Portal>
            <div
              className={KeywordsOuterStyle}
              style={keywordsStyles}
              {...keywordsAttrs}
              ref={setKeywordsPopperRef}
            >
              {CardKeywordsComponent}
            </div>
          </Portal>
        )}
        {!!hasAttachedSpell && !!card.attachment && (
          <AttachedSpellOverlay
            baseId={card.attachment}
            grade={card.grade}
            popperAttrs={cardAttrs}
            popperStyles={cardStyles}
            setAreaRef={setSpellAreaRef}
            setPoppperRef={setCardPopperRef}
            shouldShow={showSpell}
            onClick={onCardClick}
          />
        )}
        {!!hasMentioned && (
          <MentionedCardOverlay
            baseId={mentionedCardBaseId}
            grade={card.grade}
            onClick={onCardClick}
            popperAttrs={cardAttrs}
            popperStyles={cardStyles}
            setAreaRef={setMentionedAreaRef}
            setPoppperRef={setCardPopperRef}
            shouldShow={showMentioned}
          />
        )}
        {!!isLocked && (
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'full',
                position: 'absolute',
                left: 0,
                pointerEvents: 'none'
              }),
              CardLockStyle
            )}
          >
            <ItemLock />
          </div>
        )}
        {!!NewBadge && <NewBadge id={id} />}
      </div>
    )
  }
)

Card.displayName = 'Card'
