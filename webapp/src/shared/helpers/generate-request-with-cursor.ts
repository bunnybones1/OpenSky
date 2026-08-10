import { Page } from '@opensky/proto'

import { CursorPage } from '~/shared/constants/misc'

export const generatePageRequestWithCursor = (
  navTo: CursorPage | undefined,
  lastPageDetails: Page | undefined,
  defaultPage: Page
) => {
  let page
  if (lastPageDetails && navTo !== undefined) {
    if (navTo === CursorPage.next) {
      page = {
        pageSize: lastPageDetails.pageSize,
        before: lastPageDetails.after,
        sort: lastPageDetails.sort
      }
    } else {
      //previous
      page = {
        pageSize: lastPageDetails.pageSize,
        after: lastPageDetails.before,
        sort: lastPageDetails.sort
      }
    }
  } else {
    page = defaultPage
  }

  return page
}
