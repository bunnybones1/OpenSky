/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import {
  selectSilversState,
  updateSelectSilversState
} from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SelectSilverCardDetailsControlsStyle,
  ShopButton
} from './SelectSilverCardDetailsControls.css'

interface SelectSilverCardDetailsControlsProps {
  id: number
}

export const SelectSilverCardDetailsControls = memo(
  ({ id }: SelectSilverCardDetailsControlsProps) => {
    const card = useMemo(() => Cards.get(id), [id])

    const { t } = useTranslation()

    const { selectedCards } = useSnapshot(selectSilversState)

    const isSelected = useMemo(() => {
      // eslint-disable-next-line valtio/state-snapshot-rule
      return !!selectedCards.find((card) => card.id === id)
    }, [id, selectedCards])

    const onClick = useCallback(() => {
      if (!card) return
      if (isSelected) {
        updateSelectSilversState(
          'selectedCards',
          selectedCards.filter((card) => card.id !== id)
        )
      } else {
        updateSelectSilversState('selectedCards', [
          ...selectedCards,
          { id, quantity: 1 }
        ])
      }
    }, [card, id, isSelected, selectedCards])

    if (!card) return null

    const isEnchant = card.type === 'enchant'
    const isToken = card.prism === 'tok' && !isEnchant

    if (card.grade === ItemType.SW_BASE_CARDS || isEnchant || isToken) {
      return (
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full'
            }),
            SelectSilverCardDetailsControlsStyle
          )}
        >
          <Icon type="info-empty" height="16px" color="purple9" />
          <Text marginLeft="8px" fontSize="16px" color="purple9">
            {t(
              `cardDetails.${
                isEnchant
                  ? 'enchantNotTradable'
                  : isToken
                  ? 'tokenNotTradable'
                  : 'baseNotTradable'
              }`
            )}
          </Text>
        </div>
      )
    }

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            alignItems: 'center',
            justifyContent: 'flex-end',
            display: 'flex'
          }),
          SelectSilverCardDetailsControlsStyle
        )}
      >
        <Button
          frameType="default"
          colorType={isSelected ? 'secondary' : 'blue'}
          checked={isSelected}
          onClick={onClick}
          buttonClassName={ShopButton}
          text={`${t(`generic.${!isSelected ? 'Select' : 'Deselect'}`)} ${t(
            'generic.Card'
          )}`}
          className={ShopButton}
        />
      </div>
    )
  }
)

SelectSilverCardDetailsControls.displayName = 'SelectSilverCardDetailsControls'
