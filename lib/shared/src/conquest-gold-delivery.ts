export const CONQUEST_GOLD_DELIVERY_QUEUE_NAME =
  'cloud-weasel-conquest-gold-delivery'

export interface ConquestGoldDeliveryQueueMessage {
  kind: 'CONQUEST_GOLD'
  version: 1
  conquestId: number
}

export const isConquestGoldDeliveryQueueMessage = (
  value: unknown
): value is ConquestGoldDeliveryQueueMessage => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).sort().join(',') === 'conquestId,kind,version' &&
    record.kind === 'CONQUEST_GOLD' &&
    record.version === 1 &&
    Number.isSafeInteger(record.conquestId) &&
    Number(record.conquestId) > 0
  )
}
