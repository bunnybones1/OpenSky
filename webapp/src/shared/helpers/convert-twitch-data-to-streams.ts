import { TwitchStream } from '@opensky/proto'

export const convertTwitchDataToStreams = (streams: TwitchStream[]) => {
  const curatedFeed = [] as TwitchStream[]

  // Sort streams by view count
  let sortedStreams = streams.sort((streamA, streamB) => {
    return streamB.viewer_count - streamA.viewer_count
  })

  // Isolate openskys stream
  const openskyStream = sortedStreams.find((stream) => {
    return stream.user_login === 'openskylive'
  })

  if (!!openskyStream) {
    // Remove the opensky stream from the sorted array
    sortedStreams = sortedStreams.filter(
      (stream) => stream.user_login !== 'openskylive'
    )
    curatedFeed.push(openskyStream)
  }

  const pushCutoff = !!openskyStream ? 1 : 2

  // Push the two (or three if OpenSky isnt live) most popular streams
  sortedStreams.forEach((stream, i) => {
    if (i <= pushCutoff) curatedFeed.push(stream)
  })

  // Remove already pushed streams from sortedStreams
  sortedStreams = sortedStreams.filter((stream) => {
    return !curatedFeed.some((_stream) => _stream.id === stream.id)
  })

  // Push a random stream from the remaining for the last spot
  if (!!sortedStreams.length) {
    curatedFeed.push(sortedStreams[Math.floor(Math.random() * sortedStreams.length)])
  }
  return curatedFeed
}
