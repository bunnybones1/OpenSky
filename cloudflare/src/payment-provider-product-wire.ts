import type {
  ItemType,
  PaymentProvider,
  PaymentProviderProduct
} from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourcePaymentProviderProductInput = {
  provider?: Nullable<PaymentProvider>
  itemType?: Nullable<ItemType>
  code?: string
  quantity?: number
}

/** Recreates encoding/json output for the generated Go product struct. */
export const sourcePaymentProviderProductWire = (
  product: SourcePaymentProviderProductInput
): PaymentProviderProduct =>
  ({
    provider: product.provider ?? null,
    itemType: product.itemType ?? null,
    code: product.code ?? '',
    quantity: product.quantity ?? 0
  }) as unknown as PaymentProviderProduct

export const sourceNullablePaymentProviderProductListWire = (
  products: readonly SourcePaymentProviderProductInput[]
): PaymentProviderProduct[] | null =>
  products.length ? products.map(sourcePaymentProviderProductWire) : null
