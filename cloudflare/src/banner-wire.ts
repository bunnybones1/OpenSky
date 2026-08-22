import type { Banner, BannerType } from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceBannerInput = {
  order?: number
  type?: Nullable<BannerType>
  color?: Nullable<string>
  msg?: string
  dismissable?: boolean
  id?: number
  link?: Nullable<string>
  startAt?: Nullable<string>
  endAt?: Nullable<string>
}

/** Recreates encoding/json output for the generated Go Banner struct. */
export const sourceBannerWire = (banner: SourceBannerInput): Banner =>
  ({
    order: banner.order ?? 0,
    type: banner.type ?? null,
    color: banner.color ?? null,
    msg: banner.msg ?? '',
    dismissable: banner.dismissable ?? false,
    id: banner.id ?? 0,
    ...(banner.link == null ? {} : { link: banner.link }),
    ...(banner.startAt == null ? {} : { startAt: banner.startAt }),
    ...(banner.endAt == null ? {} : { endAt: banner.endAt })
  }) as unknown as Banner

export const sourceNullableBannerListWire = (
  banners: readonly SourceBannerInput[]
): Banner[] | null => (banners.length ? banners.map(sourceBannerWire) : null)
