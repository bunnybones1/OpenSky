import '@opensky/language-manager'

import {
  CommonI18nResources,
  TutorialI18nResources
} from '@opensky/language-manager'

declare module '@opensky/language-manager' {
  interface CustomTypeOptions {
    resources: CommonI18nResources & TutorialI18nResources
  }
}
