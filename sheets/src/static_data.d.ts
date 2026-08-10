import { GlobalDataSchema } from '@opensky/design-data/schema'

declare global {
  interface Window {
    STATIC_DESIGN_DATA: undefined | GlobalDataSchema
  }
}
