export const PRODUCT_NAME = 'Cloud Weasel'
export const PRODUCT_ACCOUNT_NAME = `${PRODUCT_NAME} account`
export const PRODUCT_PROBLEM_HEADING = `Sorry, ${PRODUCT_NAME} ran into a problem:`

export const productDocumentTitle = (context?: string) =>
  context === undefined ? PRODUCT_NAME : `${PRODUCT_NAME} | ${context}`

export const productVersionLabel = (commit: string) =>
  `${PRODUCT_NAME} v${commit.slice(0, 10)}`
