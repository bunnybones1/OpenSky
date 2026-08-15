import type {
  Payment,
  PaymentLog,
  PaymentProvider,
  PaymentStatus
} from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourcePaymentInput = {
  id?: number
  accountID?: number
  status?: Nullable<PaymentStatus>
  provider?: Nullable<PaymentProvider>
  externalTxnID?: string
  createdAt?: Nullable<string>
}

export type SourcePaymentLogDataInput = {
  type?: string
  data?: unknown
}

export type SourcePaymentLogInput = {
  id?: number
  paymentID?: number
  data?: Nullable<SourcePaymentLogDataInput>
  createdAt?: Nullable<string>
}

/** Recreates encoding/json output for the generated Go Payment struct. */
export const sourcePaymentWire = (payment: SourcePaymentInput): Payment =>
  ({
    id: payment.id ?? 0,
    accountID: payment.accountID ?? 0,
    status: payment.status ?? null,
    provider: payment.provider ?? null,
    externalTxnID: payment.externalTxnID ?? '',
    createdAt: payment.createdAt ?? null
  }) as unknown as Payment

/** Go allocates the payment result with make, so an empty result remains []. */
export const sourcePaymentListWire = (
  payments: readonly SourcePaymentInput[]
): Payment[] => payments.map(sourcePaymentWire)

const sourcePaymentLogDataWire = (
  data: Nullable<SourcePaymentLogDataInput>
): { type: string; data: unknown } | null =>
  data === null || data === undefined
    ? null
    : {
        type: data.type ?? '',
        data: data.data ?? null
      }

/** Recreates encoding/json output for generated Go PaymentLog and its data. */
export const sourcePaymentLogWire = (log: SourcePaymentLogInput): PaymentLog =>
  ({
    id: log.id ?? 0,
    paymentID: log.paymentID ?? 0,
    data: sourcePaymentLogDataWire(log.data),
    createdAt: log.createdAt ?? null
  }) as unknown as PaymentLog

/** Go allocates the payment-log result with make, preserving an empty array. */
export const sourcePaymentLogListWire = (
  logs: readonly SourcePaymentLogInput[]
): PaymentLog[] => logs.map(sourcePaymentLogWire)
