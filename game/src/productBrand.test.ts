import {
  PRODUCT_NAME,
  productDocumentTitle,
  productVersionLabel
} from './productBrand'

describe('Cloud Weasel product chrome', () => {
  it('provides one product name for the original game runtime', () => {
    expect(PRODUCT_NAME).toBe('Cloud Weasel')
    expect(productDocumentTitle()).toBe('Cloud Weasel')
  })

  it('formats contextual browser titles without changing their context', () => {
    expect(productDocumentTitle('Local Bot')).toBe('Cloud Weasel | Local Bot')
    expect(productDocumentTitle('Tutorial One Learn the basics')).toBe(
      'Cloud Weasel | Tutorial One Learn the basics'
    )
  })

  it('keeps the existing ten-character build identifier', () => {
    expect(productVersionLabel('0123456789abcdef')).toBe(
      'Cloud Weasel v0123456789'
    )
  })
})
