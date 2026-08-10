import { BannersRequest, BannerType } from '@opensky/proto'
import { useEffect, useState } from 'react'

import { Banner } from '~/lib/proto'
import { APIClient } from '~/shared/clients'

// TODO: Move to react-query
const useBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)

  const [bannerMessage, setBannerMessage] = useState('')
  const [bannerColor, setBannerColor] = useState('#006A93')
  const [bannerStart, setBannerStart] = useState('')
  const [bannerEnd, setBannerEnd] = useState('')
  const [bannerOrder, setBannerOrder] = useState(1)
  const [bannerEditId, setBannerEditId] = useState(undefined as undefined | number)

  const fetchGMBanners = () => {
    setLoading(true)
    setBanners([])
    APIClient.opensky
      .gMListBanners()
      .then((res) => {
        setBanners(res.banners)
      })
      .catch((err: Error) => console.error(err.message))
      .finally(() => setLoading(false))
  }

  const addBanner = () => {
    const banner = {
      order: bannerOrder ? bannerOrder : 1,
      bannerType: BannerType.INFO,
      msg: bannerMessage,
      dismissable: true,
      // link: 'test.com'
      color: bannerColor ? bannerColor : null,
      startAt: bannerStart ? new Date(bannerStart).toISOString() : null,
      endAt: bannerEnd ? new Date(bannerEnd).toISOString() : null
    } as BannersRequest
    if (banner.msg) {
      APIClient.opensky.gMAddBanner({ bannersRequest: banner }).then(() => {
        fetchGMBanners()
        resetInputs()
      })
    }
  }

  const editBanner = () => {
    const banner = {
      id: bannerEditId,
      order: bannerOrder ? bannerOrder : 1,
      msg: bannerMessage,
      dismissable: true,
      color: bannerColor ? bannerColor : null,
      startAt: bannerStart ? new Date(bannerStart).toISOString() : null,
      endAt: bannerEnd ? new Date(bannerEnd).toISOString() : null,
      type: BannerType.INFO
    } as Banner

    if (banner.msg && banner.id) {
      APIClient.opensky.gMModifyBanner({ banner }).then(() => {
        fetchGMBanners()
        resetInputs()
      })
    }
  }

  const resetInputs = () => {
    setBannerEditId(undefined)
    setBannerMessage('')
    setBannerColor('#006A93')
    setBannerStart('')
    setBannerEnd('')
    setBannerOrder(1)
  }

  const removeBanner = (id: number) => {
    APIClient.opensky.gMRemoveBanner({ id }).then(() => {
      fetchGMBanners()
    })
  }

  const loadBannerToEdit = (banner: Banner) => {
    setBannerEditId(banner.id)
    setBannerMessage(banner.msg)
    setBannerColor(banner.color ? banner.color : '#006A93')
    setBannerStart(banner.startAt ? new Date(banner.startAt).toISOString() : '')
    setBannerEnd(banner.endAt ? new Date(banner.endAt).toISOString() : '')
    setBannerOrder(banner.order)
  }

  useEffect(() => {
    fetchGMBanners()
  }, [])

  return {
    banners,
    fetchGMBanners,
    addBanner,
    loading,
    removeBanner,
    setBannerMessage,
    bannerMessage,
    bannerColor,
    setBannerColor,
    setBannerStart,
    bannerStart,
    setBannerEnd,
    bannerEnd,
    setBannerOrder,
    bannerOrder,
    setBannerEditId,
    bannerEditId,
    loadBannerToEdit,
    resetInputs,
    editBanner
  }
}

export default useBanners
