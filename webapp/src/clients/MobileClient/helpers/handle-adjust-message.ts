// The attribution data being injected as described here:
// https://i.com/adjust/react_native_sdk#attribution-callback
export type AttributionData = {
  trackerToken: string
  trackerName: string
  network: string
  campaign: string
  adgroup: string
  creative: string
  clickLabel: string
  adid: string
  costType: string
  costAmount: string
  costCurrency: string
}

const augmentSegment = (window: any, contextType: any) => {
  const middleware = ({ payload, next }) => {
    for (const key in contextType) {
      payload.obj.context[key] = contextType[key]
    }
    next(payload)
  }
  // #TODO: Add Tests for this
  window.analytics.addSourceMiddleware(middleware)
}

export const addAdjustAdvertisingId = (
  window: any,
  platformOS: string,
  adId: string
): void => {
  const contextType = {
    device: {
      type: platformOS,
      id: adId
    }
  }

  augmentSegment(window, contextType)
}

export const handleAdjustMessage = (
  window: any,
  attributionData: AttributionData
): void => {
  augmentSegment(window, attributionData)
}
