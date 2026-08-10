import { proxy } from 'valtio'

interface ConquestTicketsSelectorState {
  hasPurchasedConquest: boolean
  hasConvertedConquestTicket: boolean
}

export const conquestTicketSelectorState = proxy<ConquestTicketsSelectorState>({
  hasPurchasedConquest: false,
  hasConvertedConquestTicket: false
})

export const updateConquestTicketsSelectorState = <
  T extends keyof ConquestTicketsSelectorState
>(
  key: T,
  value: ConquestTicketsSelectorState[T]
) => {
  conquestTicketSelectorState[key] = value
}
