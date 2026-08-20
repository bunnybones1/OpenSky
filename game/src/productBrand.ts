export const PRODUCT_NAME = 'Cloud Weasel'

export const productDocumentTitle = (context?: string) =>
  context === undefined ? PRODUCT_NAME : `${PRODUCT_NAME} | ${context}`

export const productVersionLabel = (commit: string) =>
  `${PRODUCT_NAME} v${commit.slice(0, 10)}`
