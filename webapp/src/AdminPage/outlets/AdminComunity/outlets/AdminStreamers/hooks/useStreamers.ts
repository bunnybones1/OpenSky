import { useEffect, useState } from 'react'

import { TwitchFeaturedStreamer } from '~/lib/proto'
import { APIClient } from '~/shared/clients'

const useStreamers = () => {
  const [loading, setLoading] = useState(false)
  const [featuredStreamers, setFeaturedStreamers] = useState<
    TwitchFeaturedStreamer[]
  >([])
  const [streamerUsername, setStreamerUsername] = useState('')

  const fetchFeaturedStreamers = () => {
    setLoading(true)
    setFeaturedStreamers([])
    APIClient.opensky
      .getFeaturedStreamers()
      .then((res) => {
        setFeaturedStreamers(res.streamers)
      })
      .catch((err: Error) => console.error(err.message))
      .finally(() => setLoading(false))
  }

  //   const addBanner = () => {
  //     const banner = {
  //       order: bannerOrder ? bannerOrder : 1,
  //       bannerType: BannerType.INFO,
  //       msg: bannerMessage,
  //       dismissable: true,
  //       // link: 'test.com'
  //       color: bannerColor ? bannerColor : null,
  //       startAt: bannerStart ? new Date(bannerStart).toISOString() : null,
  //       endAt: bannerEnd ? new Date(bannerEnd).toISOString() : null
  //     } as BannersRequest
  //     if (banner.msg) {
  //       APIClient.opensky
  //         .gMAddBanner(
  //           { bannersRequest: banner }
  //         )
  //         .then(res => {
  //           fetchGMBanners()
  //           resetInputs()
  //         })
  //     }
  //   }

  const addFeaturedStreamer = () => {
    if (streamerUsername) {
      const featuredStreamer = {
        username: streamerUsername
      } as TwitchFeaturedStreamer
      APIClient.opensky
        .gMAddFeaturedStreamer({ streamer: featuredStreamer })
        .then(() => {
          fetchFeaturedStreamers()
          setStreamerUsername('')
        })
    }
  }

  const removeFeaturedStreamer = (username) => {
    if (username) {
      const featuredStreamer = {
        username
      } as TwitchFeaturedStreamer
      APIClient.opensky
        .gMRemoveFeaturedStreamer({ streamer: featuredStreamer })
        .then(() => {
          fetchFeaturedStreamers()
          setStreamerUsername('')
        })
    }
  }

  useEffect(() => {
    fetchFeaturedStreamers()
  }, [])

  return {
    featuredStreamers,
    fetchFeaturedStreamers,
    addFeaturedStreamer,
    loading,
    streamerUsername,
    setStreamerUsername,
    removeFeaturedStreamer
  }
}

export default useStreamers
