type FancyButtonShape = 'end-turn' | 'diagonal' | 'rectangular'
export type ButtonShape = `button-${FancyButtonShape | 'simple-round'}`
export type ButtonHighlightShape = `button-${FancyButtonShape}${'-thick' | ''}${
  | '-with-timer'
  | ''}-highlight`
