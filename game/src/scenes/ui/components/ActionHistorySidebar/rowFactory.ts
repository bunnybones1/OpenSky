import { ActionHistoryEvent, ActionHistoryItem } from '~/state/ActionHistory'

import ActionHistorySidebar from '.'
import AttackRow from './AttackRow'
import DustRow from './DustRow'
import EndTurnRow from './EndTurnRow'
import KillRow from './KillRow'
import PlayCardRow from './PlayCardRow'
import { getCardOwner } from './rowUtils'
import StartTurnRow from './StartTurnRow'
import TriggerRow from './TriggerRow'

export function createRowFromEvent(
  sidebar: ActionHistorySidebar,
  ev: ActionHistoryEvent,
  item?: ActionHistoryItem
) {
  if (!item) {
    switch (ev.type) {
      case 'PlayCard':
        return new PlayCardRow(sidebar, ev.player, ev.card, ev.attachment)

      case 'Attack': {
        return new AttackRow(
          sidebar,
          ev.player,
          ev.attacker,
          ev.defender,
          ev.attackerDied,
          ev.defenderDied,
          ev.attackerAttachment,
          ev
        )
      }

      case 'StartTurn': {
        return new StartTurnRow(sidebar, ev.player)
      }

      case 'EndTurn': {
        return new EndTurnRow(sidebar, ev.player)
      }
    }
  } else {
    switch (item.type) {
      case 'Kill': {
        if (
          ev.type !== 'Attack' ||
          (item.card.id !== ev.attacker.id && item.card.id !== ev.defender.id)
        ) {
          return new KillRow(
            sidebar,
            getCardOwner(item.card),
            item.card,
            item.attachment
          )
        }
        break
      }

      case 'Dust':
        return new DustRow(
          sidebar,
          getCardOwner(item.card),
          item.card,
          item.attachment
        )

      case 'Trigger':
        return new TriggerRow(
          sidebar,
          getCardOwner(item.card),
          item.card,
          item.attachment,
          item.effectType
        )
    }
  }

  return undefined
}
